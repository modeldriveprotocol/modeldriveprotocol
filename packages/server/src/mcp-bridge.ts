import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type {
  AuthContext,
  CallClientResultMessage
} from "@modeldriveprotocol/protocol";

import type { MdpServerRuntime } from "./mdp-server.js";

const argsSchema = z.record(z.string(), z.unknown()).optional();
const authSchema = z
  .object({
    scheme: z.string().optional(),
    token: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .optional();

const callClientsSchema = {
  clientIds: z.array(z.string()).optional(),
  kind: z.enum(["tool", "prompt", "skill", "resource"]),
  name: z.string().optional(),
  uri: z.string().optional(),
  args: argsSchema,
  auth: authSchema
};

export function createMcpBridge(runtime: MdpServerRuntime): McpServer {
  const server = new McpServer({
    name: "modeldriveprotocol-server",
    version: "0.1.0"
  });

  server.registerTool(
    "listClients",
    {
      description: "List currently connected MDP clients and their capability summaries."
    },
    async () => successResult({ clients: runtime.listClients() })
  );

  server.registerTool(
    "callClients",
    {
      description:
        "Invoke a capability on one or more MDP clients using the generic bridge surface.",
      inputSchema: callClientsSchema
    },
    async ({ clientIds, kind, name, uri, args, auth }) => {
      const targets =
        clientIds && clientIds.length > 0
          ? clientIds
          : runtime.findMatchingClientIds({
              kind,
              ...(name ? { name } : {}),
              ...(uri ? { uri } : {})
            });

      if (targets.length === 0) {
        return errorResult("No matching MDP clients were found");
      }

      const results = await Promise.all(
        targets.map(async (clientId) => ({
          clientId,
          ...(await unwrapInvocation(
            runtime.invoke({
              clientId,
              kind,
              ...(name ? { name } : {}),
              ...(uri ? { uri } : {}),
              ...(args ? { args } : {}),
              ...withAuth(auth)
            })
          ))
        }))
      );

      return successResult({ results });
    }
  );

  server.registerTool(
    "listTools",
    {
      description: "List all tools registered by connected MDP clients.",
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) => successResult({ tools: runtime.capabilityIndex.listTools(clientId) })
  );

  server.registerTool(
    "callTools",
    {
      description: "Invoke a tool exposed by a specific MDP client.",
      inputSchema: {
        clientId: z.string(),
        toolName: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, toolName, args, auth }) =>
      invocationResult(
        await runtime.invoke({
          clientId,
          kind: "tool",
          name: toolName,
          ...(args ? { args } : {}),
          ...withAuth(auth)
        })
      )
  );

  server.registerTool(
    "listPrompts",
    {
      description: "List all prompts registered by connected MDP clients.",
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) =>
      successResult({ prompts: runtime.capabilityIndex.listPrompts(clientId) })
  );

  server.registerTool(
    "getPrompt",
    {
      description: "Resolve a prompt exposed by a specific MDP client.",
      inputSchema: {
        clientId: z.string(),
        promptName: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, promptName, args, auth }) =>
      invocationResult(
        await runtime.invoke({
          clientId,
          kind: "prompt",
          name: promptName,
          ...(args ? { args } : {}),
          ...withAuth(auth)
        })
      )
  );

  server.registerTool(
    "listSkills",
    {
      description: "List all skills registered by connected MDP clients.",
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) =>
      successResult({ skills: runtime.capabilityIndex.listSkills(clientId) })
  );

  server.registerTool(
    "callSkills",
    {
      description: "Invoke a skill exposed by a specific MDP client.",
      inputSchema: {
        clientId: z.string(),
        skillName: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, skillName, args, auth }) =>
      invocationResult(
        await runtime.invoke({
          clientId,
          kind: "skill",
          name: skillName,
          ...(args ? { args } : {}),
          ...withAuth(auth)
        })
      )
  );

  server.registerTool(
    "listResources",
    {
      description: "List all resources registered by connected MDP clients.",
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) =>
      successResult({ resources: runtime.capabilityIndex.listResources(clientId) })
  );

  server.registerTool(
    "readResource",
    {
      description: "Read a resource exposed by a specific MDP client.",
      inputSchema: {
        clientId: z.string(),
        uri: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, uri, args, auth }) =>
      invocationResult(
        await runtime.invoke({
          clientId,
          kind: "resource",
          uri,
          ...(args ? { args } : {}),
          ...withAuth(auth)
        })
      )
  );

  return server;
}

async function unwrapInvocation(
  promise: Promise<CallClientResultMessage>
): Promise<{ ok: boolean; data?: unknown; error?: unknown }> {
  const result = await promise;

  if (result.ok) {
    return { ok: true, data: result.data };
  }

  return {
    ok: false,
    error: result.error ?? { message: "Unknown client error" }
  };
}

function invocationResult(result: CallClientResultMessage) {
  if (!result.ok) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              ok: false,
              error: result.error ?? { message: "Unknown client error" }
            },
            null,
            2
          )
        }
      ],
      structuredContent: {
        ok: false,
        error: result.error ?? { message: "Unknown client error" }
      },
      isError: true
    };
  }

  return successResult({
    ok: true,
    data: result.data
  });
}

function successResult(payload: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  };
}

function normalizeAuth(
  auth:
    | {
        scheme?: string | undefined;
        token?: string | undefined;
        headers?: Record<string, string> | undefined;
        metadata?: Record<string, unknown> | undefined;
      }
    | undefined
): AuthContext | undefined {
  if (!auth) {
    return undefined;
  }

  const normalized: AuthContext = {};

  if (auth.scheme) {
    normalized.scheme = auth.scheme;
  }

  if (auth.token) {
    normalized.token = auth.token;
  }

  if (auth.headers && Object.keys(auth.headers).length > 0) {
    normalized.headers = auth.headers;
  }

  if (auth.metadata && Object.keys(auth.metadata).length > 0) {
    normalized.metadata = auth.metadata as NonNullable<AuthContext["metadata"]>;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function withAuth(
  auth:
    | {
        scheme?: string | undefined;
        token?: string | undefined;
        headers?: Record<string, string> | undefined;
        metadata?: Record<string, unknown> | undefined;
      }
    | undefined
) {
  const normalized = normalizeAuth(auth);
  return normalized ? { auth: normalized } : {};
}

function errorResult(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            ok: false,
            error: message
          },
          null,
          2
        )
      }
    ],
    structuredContent: {
      ok: false,
      error: message
    },
    isError: true
  };
}
