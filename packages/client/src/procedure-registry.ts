import type {
  CallClientMessage,
  ClientDescriptor,
  PromptDescriptor,
  ResourceDescriptor,
  SkillDescriptor,
  ToolDescriptor
} from "@mdp/protocol";

import type {
  CapabilityHandler,
  ClientInfo,
  ExposePromptOptions,
  ExposeResourceOptions,
  ExposeSkillOptions,
  ExposeToolOptions
} from "./types.js";

interface ProcedureEntry<TDescriptor> {
  descriptor: TDescriptor;
  handler: CapabilityHandler;
}

export class ProcedureRegistry {
  private readonly tools = new Map<string, ProcedureEntry<ToolDescriptor>>();
  private readonly prompts = new Map<string, ProcedureEntry<PromptDescriptor>>();
  private readonly skills = new Map<string, ProcedureEntry<SkillDescriptor>>();
  private readonly resources = new Map<string, ProcedureEntry<ResourceDescriptor>>();

  exposeTool(
    name: string,
    handler: CapabilityHandler,
    options: ExposeToolOptions = {}
  ): this {
    this.tools.set(name, {
      descriptor: {
        name,
        ...(options.description ? { description: options.description } : {}),
        ...(options.inputSchema ? { inputSchema: options.inputSchema } : {})
      },
      handler
    });

    return this;
  }

  exposePrompt(
    name: string,
    handler: CapabilityHandler,
    options: ExposePromptOptions = {}
  ): this {
    this.prompts.set(name, {
      descriptor: {
        name,
        ...(options.description ? { description: options.description } : {}),
        ...(options.arguments ? { arguments: options.arguments } : {})
      },
      handler
    });

    return this;
  }

  exposeSkill(
    name: string,
    handler: CapabilityHandler,
    options: ExposeSkillOptions = {}
  ): this {
    this.skills.set(name, {
      descriptor: {
        name,
        ...(options.description ? { description: options.description } : {}),
        ...(options.inputSchema ? { inputSchema: options.inputSchema } : {})
      },
      handler
    });

    return this;
  }

  exposeResource(
    uri: string,
    handler: CapabilityHandler,
    options: ExposeResourceOptions
  ): this {
    this.resources.set(uri, {
      descriptor: {
        uri,
        name: options.name,
        ...(options.description ? { description: options.description } : {}),
        ...(options.mimeType ? { mimeType: options.mimeType } : {})
      },
      handler
    });

    return this;
  }

  describe(client: ClientInfo): ClientDescriptor {
    return {
      ...client,
      tools: [...this.tools.values()].map(({ descriptor }) => descriptor),
      prompts: [...this.prompts.values()].map(({ descriptor }) => descriptor),
      skills: [...this.skills.values()].map(({ descriptor }) => descriptor),
      resources: [...this.resources.values()].map(({ descriptor }) => descriptor)
    };
  }

  invoke(message: Pick<CallClientMessage, "kind" | "name" | "uri" | "args">): Promise<unknown> {
    switch (message.kind) {
      case "tool":
        return this.run(this.tools, message.name, "tool", message.args);
      case "prompt":
        return this.run(this.prompts, message.name, "prompt", message.args);
      case "skill":
        return this.run(this.skills, message.name, "skill", message.args);
      case "resource":
        return this.run(this.resources, message.uri, "resource", message.args);
    }
  }

  private async run<TDescriptor>(
    entries: Map<string, ProcedureEntry<TDescriptor>>,
    key: string | undefined,
    kind: string,
    args: CallClientMessage["args"]
  ): Promise<unknown> {
    if (!key) {
      throw new Error(`Missing ${kind} key`);
    }

    const entry = entries.get(key);

    if (!entry) {
      throw new Error(`Unknown ${kind} "${key}"`);
    }

    return entry.handler(args);
  }
}
