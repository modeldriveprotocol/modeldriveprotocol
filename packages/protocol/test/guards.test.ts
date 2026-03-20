import { describe, expect, it } from "vitest";

import { createSerializedError, isStringRecord, parseMessage } from "../src/index.js";

const clientDescriptor = {
  id: "client-01",
  name: "Protocol Test Client",
  tools: [],
  prompts: [],
  skills: [],
  resources: []
};

describe("protocol guards", () => {
  it("parses a valid registerClient message", () => {
    const message = parseMessage(
      JSON.stringify({
        type: "registerClient",
        client: clientDescriptor
      })
    );

    expect(message).toEqual({
      type: "registerClient",
      client: clientDescriptor
    });
  });

  it("rejects callClient messages without a name or uri target", () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          type: "callClient",
          requestId: "req-01",
          clientId: "client-01",
          kind: "tool"
        })
      )
    ).toThrow("Invalid MDP message");
  });

  it("accepts string records and preserves serialized error details", () => {
    const error = createSerializedError("bad_request", "Invalid input", {
      field: "query"
    });

    expect(error).toEqual({
      code: "bad_request",
      message: "Invalid input",
      details: {
        field: "query"
      }
    });
    expect(isStringRecord({ host: "127.0.0.1", port: "7070" })).toBe(true);
    expect(isStringRecord({ host: "127.0.0.1", port: 7070 })).toBe(false);
  });
});
