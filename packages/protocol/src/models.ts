import type { JsonObject, JsonSchema } from "./json.js";

export const capabilityKinds = ["tool", "prompt", "skill", "resource"] as const;

export type CapabilityKind = (typeof capabilityKinds)[number];

export interface ToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

export interface PromptArgumentDescriptor {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptDescriptor {
  name: string;
  description?: string;
  arguments?: PromptArgumentDescriptor[];
}

export interface SkillDescriptor {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

export interface ResourceDescriptor {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ClientDescriptor {
  id: string;
  name: string;
  description?: string;
  version?: string;
  platform?: string;
  metadata?: JsonObject;
  tools: ToolDescriptor[];
  prompts: PromptDescriptor[];
  skills: SkillDescriptor[];
  resources: ResourceDescriptor[];
}

export interface ListedClient extends ClientDescriptor {
  status: "online";
  connectedAt: string;
  lastSeenAt: string;
}

export interface IndexedToolDescriptor extends ToolDescriptor {
  clientId: string;
  clientName: string;
}

export interface IndexedPromptDescriptor extends PromptDescriptor {
  clientId: string;
  clientName: string;
}

export interface IndexedSkillDescriptor extends SkillDescriptor {
  clientId: string;
  clientName: string;
}

export interface IndexedResourceDescriptor extends ResourceDescriptor {
  clientId: string;
  clientName: string;
}
