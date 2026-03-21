import type { JsonObject, JsonSchema } from "./json.js";

export const capabilityKinds = ["tool", "prompt", "skill", "resource"] as const;
export const clientConnectionModes = ["ws", "http-loop"] as const;
export const clientAuthSources = [
  "none",
  "message",
  "transport",
  "transport+message"
] as const;

export type CapabilityKind = (typeof capabilityKinds)[number];
export type ClientConnectionMode = (typeof clientConnectionModes)[number];
export type ClientAuthSource = (typeof clientAuthSources)[number];

export interface AuthContext {
  scheme?: string;
  token?: string;
  headers?: Record<string, string>;
  metadata?: JsonObject;
}

export interface ClientConnectionDescriptor {
  mode: ClientConnectionMode;
  secure: boolean;
  authSource: ClientAuthSource;
}

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
  contentType?: string;
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
  connection: ClientConnectionDescriptor;
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
