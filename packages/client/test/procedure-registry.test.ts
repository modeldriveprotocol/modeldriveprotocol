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
    const toolHandler = vi.fn(async ({ query }) => ({ query, matches: 3 }));
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
        kind: "tool",
        name: "searchDom",
        args: { query: "mdp" }
      })
    ).resolves.toEqual({
      query: "mdp",
      matches: 3
    });
    await expect(
      registry.invoke({
        kind: "resource",
        uri: "webpage://selection"
      })
    ).resolves.toEqual({
      mimeType: "text/plain",
      text: "Selected text"
    });

    expect(toolHandler).toHaveBeenCalledWith({ query: "mdp" });
    expect(resourceHandler).toHaveBeenCalledOnce();
  });

  it("throws when the target key is missing or unknown", async () => {
    const registry = new ProcedureRegistry();

    await expect(
      registry.invoke({
        kind: "tool"
      })
    ).rejects.toThrow('Missing tool key');

    await expect(
      registry.invoke({
        kind: "tool",
        name: "missingTool"
      })
    ).rejects.toThrow('Unknown tool "missingTool"');
  });
});
