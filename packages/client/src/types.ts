import type {
  AuthContext,
  CapabilityKind,
  ClientDescriptor,
  ClientToServerMessage,
  JsonObject,
  JsonSchema,
  PromptArgumentDescriptor,
  RpcArguments,
  ServerToClientMessage
} from "@modeldriveprotocol/protocol";

export interface ClientInfo {
  id: string;
  name: string;
  description?: string;
  version?: string;
  platform?: string;
  metadata?: JsonObject;
}

export interface CapabilityInvocationContext {
  requestId: string;
  clientId: string;
  kind: CapabilityKind;
  name?: string;
  uri?: string;
  auth?: AuthContext;
}

export type CapabilityHandler<TResult = unknown> = (
  args: RpcArguments | undefined,
  context: CapabilityInvocationContext
) => TResult | Promise<TResult>;

export interface ExposeToolOptions {
  description?: string;
  inputSchema?: JsonSchema;
}

export interface ExposePromptOptions {
  description?: string;
  arguments?: PromptArgumentDescriptor[];
}

export interface ExposeSkillOptions {
  description?: string;
  inputSchema?: JsonSchema;
}

export interface ExposeResourceOptions {
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ClientTransport {
  connect(): Promise<void>;
  send(message: ClientToServerMessage): void;
  close(code?: number, reason?: string): Promise<void>;
  onMessage(handler: (message: ServerToClientMessage) => void): void;
  onClose(handler: () => void): void;
}

export interface MdpClientOptions {
  serverUrl: string;
  client: ClientInfo;
  auth?: AuthContext;
  transport?: ClientTransport;
}

export interface BrowserScriptClientAttributes {
  serverUrl?: string;
  serverHost?: string;
  serverPort?: number;
  serverProtocol?: "ws" | "wss" | "http" | "https";
  clientId?: string;
  clientName?: string;
  clientDescription?: string;
}

export type ClientDescriptorOverride = Partial<
  Omit<ClientDescriptor, "tools" | "prompts" | "skills" | "resources">
>;
