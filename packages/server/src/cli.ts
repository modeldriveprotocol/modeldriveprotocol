#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createMcpBridge } from "./mcp-bridge.js";
import { MdpServerRuntime } from "./mdp-server.js";
import {
  MdpTransportServer,
  type MdpTransportServerOptions
} from "./transport-server.js";

interface CliOptions {
  host: string;
  port: number;
  tlsKeyPath?: string;
  tlsCertPath?: string;
  tlsCaPath?: string;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const runtime = new MdpServerRuntime();
  const transportServer = new MdpTransportServer(runtime, await toServerOptions(options));
  const mcpServer = createMcpBridge(runtime);
  const transport = new StdioServerTransport();

  await transportServer.start();
  await mcpServer.connect(transport);

  const endpoints = transportServer.endpoints;
  console.error(`MDP server listening on ${endpoints.ws}`);
  console.error(`MDP HTTP loop endpoint listening on ${endpoints.httpLoop}`);

  const shutdown = async () => {
    await Promise.allSettled([mcpServer.close(), transportServer.stop()]);
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
      continue;
    }

    if (value === "--tls-key") {
      options.tlsKeyPath = nextValue;
      index += 1;
      continue;
    }

    if (value === "--tls-cert") {
      options.tlsCertPath = nextValue;
      index += 1;
      continue;
    }

    if (value === "--tls-ca") {
      options.tlsCaPath = nextValue;
      index += 1;
    }
  }

  return options;
}

async function toServerOptions(
  options: CliOptions
): Promise<MdpTransportServerOptions> {
  return {
    host: options.host,
    port: options.port,
    ...(await loadTlsOptions(options))
  };
}

async function loadTlsOptions(
  options: CliOptions
): Promise<Pick<MdpTransportServerOptions, "tls"> | Record<string, never>> {
  if (!options.tlsKeyPath && !options.tlsCertPath && !options.tlsCaPath) {
    return {};
  }

  if (!options.tlsKeyPath || !options.tlsCertPath) {
    throw new Error("Both --tls-key and --tls-cert are required to enable TLS");
  }

  const [key, cert, ca] = await Promise.all([
    readFile(options.tlsKeyPath),
    readFile(options.tlsCertPath),
    options.tlsCaPath ? readFile(options.tlsCaPath) : Promise.resolve(undefined)
  ]);

  return {
    tls: {
      key,
      cert,
      ...(ca ? { ca } : {})
    }
  };
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
