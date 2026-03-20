import { describe, expect, it, vi } from "vitest";

import { ProcedureRegistry } from "../src/procedure-registry.js";

describe("ProcedureRegistry", () => {
  it("describes all exposed capability kinds", () => {
    const registry = new ProcedureRegistry();

    registry
      .exposeTool("searchDom", async () => ({ matches: 1 }), {
        description: "Search the page"
      })
      .exposePrompt("summarizeSelection", async () => ({
        messages: [{ role: "user", content: "Summarize" }]
      }))
      .exposeSkill("pageReview", async () => ({ findings: [] }))
      .exposeResource("webpage://selection", async () => ({
        mimeType: "text/plain",
        text: "Hello"
      }), {
        name: "Selection",
        mimeType: "text/plain"
      });

    const descriptor = registry.describe({
      id: "client-01",
      name: "Browser Client"
    });

    expect(descriptor.tools).toEqual([
      {
        name: "searchDom",
        description: "Search the page"
      }
    ]);
    expect(descriptor.prompts).toEqual([
      {
        name: "summarizeSelection"
      }
    ]);
    expect(descriptor.skills).toEqual([
      {
        name: "pageReview"
      }
    ]);
    expect(descriptor.resources).toEqual([
      {
        uri: "webpage://selection",
        name: "Selection",
        mimeType: "text/plain"
      }
    ]);
  });

  it("routes invocation by capability kind", async () => {
    const toolHandler = vi.fn(async ({ query }, context) => ({
      query,
      matches: 3,
      authToken: context.auth?.token
    }));
    const resourceHandler = vi.fn(async () => ({
      mimeType: "text/plain",
      text: "Selected text"
    }));
    const registry = new ProcedureRegistry();

    registry.exposeTool("searchDom", toolHandler);
    registry.exposeResource("webpage://selection", resourceHandler, {
      name: "Selection"
    });

    await expect(
      registry.invoke({
        requestId: "req-01",
        clientId: "client-01",
        kind: "tool",
        name: "searchDom",
        args: { query: "mdp" },
        auth: {
          token: "host-token"
        }
      })
    ).resolves.toEqual({
      query: "mdp",
      matches: 3,
      authToken: "host-token"
    });
    await expect(
      registry.invoke({
        requestId: "req-02",
        clientId: "client-01",
        kind: "resource",
        uri: "webpage://selection"
      })
    ).resolves.toEqual({
      mimeType: "text/plain",
      text: "Selected text"
    });

    expect(toolHandler).toHaveBeenCalledWith(
      { query: "mdp" },
      {
        requestId: "req-01",
        clientId: "client-01",
        kind: "tool",
        name: "searchDom",
        auth: {
          token: "host-token"
        }
      }
    );
    expect(resourceHandler).toHaveBeenCalledOnce();
  });

  it("throws when the target key is missing or unknown", async () => {
    const registry = new ProcedureRegistry();

    await expect(
      registry.invoke({
        requestId: "req-03",
        clientId: "client-01",
        kind: "tool"
      })
    ).rejects.toThrow('Missing tool key');

    await expect(
      registry.invoke({
        requestId: "req-04",
        clientId: "client-01",
        kind: "tool",
        name: "missingTool"
      })
    ).rejects.toThrow('Unknown tool "missingTool"');
  });
});
