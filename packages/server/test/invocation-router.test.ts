import { describe, expect, it, vi } from "vitest";

import type { CapabilityIndex } from "../src/capability-index.js";
import type { ClientSession } from "../src/client-session.js";
import { InvocationRouter } from "../src/invocation-router.js";

describe("InvocationRouter", () => {
  it("sends routed invocations and resolves matching results", async () => {
    const session = {
      send: vi.fn()
    } as unknown as ClientSession;
    const capabilityIndex = {
      hasTarget: vi.fn(() => true)
    } as unknown as CapabilityIndex;
    const router = new InvocationRouter(() => session, capabilityIndex, 1_000);

    const invocation = router.invoke({
      clientId: "client-01",
      kind: "tool",
      name: "searchDom",
      args: {
        query: "mdp"
      },
      auth: {
        token: "host-token"
      }
    });

    const outboundMessage = vi.mocked(session.send).mock.calls[0]?.[0] as {
      requestId: string;
      auth?: {
        token?: string;
      };
    };

    expect(outboundMessage.requestId).toBeTypeOf("string");
    expect(outboundMessage.auth).toEqual({
      token: "host-token"
    });

    const resolved = router.resolve({
      type: "callClientResult",
      requestId: outboundMessage.requestId,
      ok: true,
      data: {
        matches: 3
      }
    });

    expect(resolved).toBe(true);
    await expect(invocation).resolves.toEqual({
      type: "callClientResult",
      requestId: outboundMessage.requestId,
      ok: true,
      data: {
        matches: 3
      }
    });
  });

  it("rejects invalid targets before dispatch", () => {
    const capabilityIndex = {
      hasTarget: vi.fn(() => false)
    } as unknown as CapabilityIndex;
    const router = new InvocationRouter(() => undefined, capabilityIndex, 1_000);

    expect(() =>
      router.invoke({
        clientId: "client-01",
        kind: "tool",
        name: "missingTool"
      })
    ).toThrow('Capability "missingTool" was not found on client "client-01"');
  });

  it("times out pending invocations", async () => {
    vi.useFakeTimers();

    try {
      const session = {
        send: vi.fn()
      } as unknown as ClientSession;
      const capabilityIndex = {
        hasTarget: vi.fn(() => true)
      } as unknown as CapabilityIndex;
      const router = new InvocationRouter(() => session, capabilityIndex, 50);

      const invocation = router.invoke({
        clientId: "client-01",
        kind: "tool",
        name: "searchDom"
      });
      const rejection = expect(invocation).rejects.toThrow(
        'Invocation timed out for client "client-01"'
      );

      await vi.advanceTimersByTimeAsync(51);

      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
