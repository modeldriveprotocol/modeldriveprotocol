#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createMcpBridge } from "./mcp-bridge.js";
import { MdpServerRuntime } from "./mdp-server.js";
import { MdpWebSocketServer } from "./ws-server.js";

interface CliOptions {
  host: string;
  port: number;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const runtime = new MdpServerRuntime();
  const wsServer = new MdpWebSocketServer(runtime, options);
  const mcpServer = createMcpBridge(runtime);
  const transport = new StdioServerTransport();

  await wsServer.start();
  await mcpServer.connect(transport);

  const { host, port } = wsServer.address;
  console.error(`MDP server listening on ws://${host}:${port}`);

  const shutdown = async () => {
    await Promise.allSettled([mcpServer.close(), wsServer.stop()]);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    host: "127.0.0.1",
    port: 7070
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const nextValue = argv[index + 1];

    if (!nextValue) {
      continue;
    }

    if (value === "--host") {
      options.host = nextValue;
      index += 1;
      continue;
    }

    if (value === "--port") {
      options.port = Number(nextValue);
      index += 1;
    }
  }

  return options;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
