import { describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

import { MdpServerRuntime } from "../src/mdp-server.js";

function createSocket() {
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn()
  } as unknown as WebSocket;
}

function createDescriptor(name = "Browser Client") {
  return {
    id: "client-01",
    name,
    tools: [{ name: "searchDom" }],
    prompts: [],
    skills: [],
    resources: []
  };
}

describe("MdpServerRuntime", () => {
  it("registers clients and lists them through the capability index", () => {
    const runtime = new MdpServerRuntime();
    const session = runtime.createSession("conn-01", createSocket());

    runtime.handleMessage(session, {
      type: "registerClient",
      client: createDescriptor()
    });

    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: "client-01",
        name: "Browser Client",
        status: "online"
      })
    ]);
  });

  it("replaces older sessions when a client re-registers with the same id", () => {
    const runtime = new MdpServerRuntime();
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const firstSession = runtime.createSession("conn-01", firstSocket);
    const secondSession = runtime.createSession("conn-02", secondSocket);

    runtime.handleMessage(firstSession, {
      type: "registerClient",
      client: createDescriptor("Older Client")
    });
    runtime.handleMessage(secondSession, {
      type: "registerClient",
      client: createDescriptor("Newer Client")
    });

    expect(vi.mocked(firstSocket.close)).toHaveBeenCalledWith(
      4000,
      "Replaced by newer client session"
    );
    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: "client-01",
        name: "Newer Client"
      })
    ]);
  });

  it("unregisters the active client session", () => {
    const runtime = new MdpServerRuntime();
    const session = runtime.createSession("conn-01", createSocket());

    runtime.handleMessage(session, {
      type: "registerClient",
      client: createDescriptor()
    });
    runtime.handleMessage(session, {
      type: "unregisterClient",
      clientId: "client-01"
    });

    expect(runtime.listClients()).toEqual([]);
  });
});
