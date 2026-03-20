import { describe, expect, it, vi } from "vitest";

import type {
  ClientToServerMessage,
  ServerToClientMessage
} from "@modeldriveprotocol/protocol";
import type { ClientTransport } from "../src/types.js";
import { createMdpClient } from "../src/mdp-client.js";

class FakeTransport implements ClientTransport {
  readonly sent: ClientToServerMessage[] = [];

  private messageHandler?: (message: ServerToClientMessage) => void;
  private closeHandler?: () => void;

  connect = vi.fn(async () => {});

  send = vi.fn((message: ClientToServerMessage) => {
    this.sent.push(message);
  });

  close = vi.fn(async () => {});

  onMessage(handler: (message: ServerToClientMessage) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  emit(message: ServerToClientMessage): void {
    this.messageHandler?.(message);
  }

  emitClose(): void {
    this.closeHandler?.();
  }
}

describe("MdpClient", () => {
  it("requires a connection before register", () => {
    const transport = new FakeTransport();
    const client = createMdpClient({
      serverUrl: "http://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: "Browser Client"
      },
      auth: {
        scheme: "Bearer",
        token: "client-token"
      },
      transport
    });

    expect(() => client.register()).toThrow("MDP client is not connected");
  });

  it("registers exposed capabilities after connect", async () => {
    const transport = new FakeTransport();
    const client = createMdpClient({
      serverUrl: "ws://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: "Browser Client"
      },
      auth: {
        scheme: "Bearer",
        token: "client-token"
      },
      transport
    });

    client.exposeTool("searchDom", async () => ({ matches: 1 }), {
      description: "Search the DOM"
    });

    await client.connect();
    client.register({
      description: "Test browser client"
    });

    expect(transport.connect).toHaveBeenCalledOnce();
    expect(transport.send).toHaveBeenCalledWith({
      type: "registerClient",
      client: {
        id: "browser-01",
        name: "Browser Client",
        description: "Test browser client",
        tools: [
          {
            name: "searchDom",
            description: "Search the DOM"
          }
        ],
        prompts: [],
        skills: [],
        resources: []
      },
      auth: {
        scheme: "Bearer",
        token: "client-token"
      }
    });
  });

  it("responds to ping and routed invocation messages", async () => {
    const transport = new FakeTransport();
    const client = createMdpClient({
      serverUrl: "ws://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: "Browser Client"
      },
      transport
    });

    client.exposeTool("searchDom", async ({ query }, context) => ({
      query,
      matches: 3,
      authToken: context.auth?.token
    }));

    transport.emit({
      type: "ping",
      timestamp: 123
    });
    transport.emit({
      type: "callClient",
      requestId: "req-01",
      clientId: "browser-01",
      kind: "tool",
      name: "searchDom",
      args: {
        query: "modeldriveprotocol"
      },
      auth: {
        token: "host-token"
      }
    });

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: "pong",
          timestamp: 123
        },
        {
          type: "callClientResult",
          requestId: "req-01",
          ok: true,
          data: {
            query: "modeldriveprotocol",
            matches: 3,
            authToken: "host-token"
          }
        }
      ]);
    });
  });

  it("serializes handler failures from routed invocations", async () => {
    const transport = new FakeTransport();
    const client = createMdpClient({
      serverUrl: "ws://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: "Browser Client"
      },
      transport
    });

    transport.emit({
      type: "callClient",
      requestId: "req-02",
      clientId: "browser-01",
      kind: "tool",
      name: "missingTool"
    });

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: "callClientResult",
          requestId: "req-02",
          ok: false,
          error: {
            code: "handler_error",
            message: 'Unknown tool "missingTool"'
          }
        }
      ]);
    });
  });

  it("updates registration auth via setAuth", async () => {
    const transport = new FakeTransport();
    const client = createMdpClient({
      serverUrl: "ws://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: "Browser Client"
      },
      transport
    });

    await client.connect();
    client.setAuth({
      token: "rotated-token"
    });
    client.register();

    expect(transport.sent[0]).toEqual({
      type: "registerClient",
      client: {
        id: "browser-01",
        name: "Browser Client",
        tools: [],
        prompts: [],
        skills: [],
        resources: []
      },
      auth: {
        token: "rotated-token"
      }
    });
  });
});
