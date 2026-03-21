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
      .exposeSkill(
        "page/review",
        "# Page Review\n\nReview the active page.\n\nYou can read `page/review/evidence` for deeper context."
      )
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
        name: "page/review",
        description: "Review the active page.",
        contentType: "text/markdown"
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
    const skillMarkdown =
      "# Page Review\n\nReview the active page.\n\nYou can read `page/review/evidence` for deeper context.";
    const resourceHandler = vi.fn(async () => ({
      mimeType: "text/plain",
      text: "Selected text"
    }));
    const registry = new ProcedureRegistry();

    registry.exposeTool("searchDom", toolHandler);
    registry.exposeSkill("page/review", skillMarkdown);
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
        kind: "skill",
        name: "page/review"
      })
    ).resolves.toEqual(skillMarkdown);
    await expect(
      registry.invoke({
        requestId: "req-015",
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

  it("invokes skill resolvers with query params and headers", async () => {
    const registry = new ProcedureRegistry();
    const skillResolver = vi.fn(async (query, headers) =>
      `# Query Skill\n\nquery=${query.q}\nheader=${headers["x-test-header"]}`
    );

    registry.exposeSkill("docs/query", skillResolver);

    await expect(
      registry.invoke({
        requestId: "req-20",
        clientId: "client-01",
        kind: "skill",
        name: "docs/query",
        args: {
          query: {
            q: "mdp"
          },
          headers: {
            "x-test-header": "present"
          }
        }
      })
    ).resolves.toBe("# Query Skill\n\nquery=mdp\nheader=present");

    expect(skillResolver).toHaveBeenCalledWith(
      {
        q: "mdp"
      },
      {
        "x-test-header": "present"
      },
      expect.objectContaining({
        clientId: "client-01",
        name: "docs/query"
      })
    );
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

  it("rejects invalid skill paths at registration time", () => {
    const registry = new ProcedureRegistry();

    expect(() =>
      registry.exposeSkill("workspace/../review", "# Invalid")
    ).toThrow(
      'Invalid skill path "workspace/../review". Expected slash-separated lowercase segments using only a-z, 0-9, "-" and "_".'
    );
  });
});
