import { createSerializedError, isMdpMessage, type CallClientMessage } from "@mdp/protocol";

import { ProcedureRegistry } from "./procedure-registry.js";
import type {
  BrowserScriptClientAttributes,
  CapabilityHandler,
  ClientDescriptorOverride,
  ClientInfo,
  ExposePromptOptions,
  ExposeResourceOptions,
  ExposeSkillOptions,
  ExposeToolOptions,
  MdpClientOptions
} from "./types.js";
import { WebSocketClientTransport } from "./ws-client.js";

export class MdpClient {
  private clientInfo: ClientInfo;
  private readonly registry = new ProcedureRegistry();
  private readonly transport;
  private connected = false;
  private registered = false;

  constructor(options: MdpClientOptions) {
    this.clientInfo = options.client;
    this.transport = options.transport ?? new WebSocketClientTransport(options.serverUrl);
    this.transport.onMessage((message) => {
      void this.handleMessage(message);
    });
    this.transport.onClose(() => {
      this.connected = false;
      this.registered = false;
    });
  }

  exposeTool(
    name: string,
    handler: CapabilityHandler,
    options?: ExposeToolOptions
  ): this {
    this.registry.exposeTool(name, handler, options);
    return this;
  }

  exposePrompt(
    name: string,
    handler: CapabilityHandler,
    options?: ExposePromptOptions
  ): this {
    this.registry.exposePrompt(name, handler, options);
    return this;
  }

  exposeSkill(
    name: string,
    handler: CapabilityHandler,
    options?: ExposeSkillOptions
  ): this {
    this.registry.exposeSkill(name, handler, options);
    return this;
  }

  exposeResource(
    uri: string,
    handler: CapabilityHandler,
    options: ExposeResourceOptions
  ): this {
    this.registry.exposeResource(uri, handler, options);
    return this;
  }

  async connect(): Promise<void> {
    await this.transport.connect();
    this.connected = true;
  }

  register(overrides: ClientDescriptorOverride = {}): void {
    this.ensureConnected();
    this.clientInfo = {
      ...this.clientInfo,
      ...overrides
    };

    this.transport.send({
      type: "registerClient",
      client: this.registry.describe(this.clientInfo)
    });
    this.registered = true;
  }

  async disconnect(): Promise<void> {
    if (this.connected && this.registered) {
      this.transport.send({
        type: "unregisterClient",
        clientId: this.clientInfo.id
      });
    }

    await this.transport.close();
    this.connected = false;
    this.registered = false;
  }

  describe() {
    return this.registry.describe(this.clientInfo);
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isMdpMessage(message)) {
      return;
    }

    switch (message.type) {
      case "ping":
        this.transport.send({
          type: "pong",
          timestamp: message.timestamp
        });
        return;
      case "callClient":
        await this.handleInvocation(message);
        return;
      default:
        return;
    }
  }

  private async handleInvocation(message: CallClientMessage): Promise<void> {
    try {
      const data = await this.registry.invoke(message);

      this.transport.send({
        type: "callClientResult",
        requestId: message.requestId,
        ok: true,
        data
      });
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));

      this.transport.send({
        type: "callClientResult",
        requestId: message.requestId,
        ok: false,
        error: createSerializedError("handler_error", normalized.message)
      });
    }
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error("MDP client is not connected");
    }
  }
}

export function createMdpClient(options: MdpClientOptions): MdpClient {
  return new MdpClient(options);
}

export function resolveServerUrl(attributes: BrowserScriptClientAttributes): string {
  if (attributes.serverUrl) {
    return attributes.serverUrl;
  }

  const protocol = attributes.serverProtocol ?? "ws";
  const host = attributes.serverHost ?? "127.0.0.1";
  const port = attributes.serverPort ?? 7070;

  return `${protocol}://${host}:${port}`;
}
