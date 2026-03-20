import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

import { isMdpMessage, parseMessage, type ClientToServerMessage } from "@mdp/protocol";
import type { RawData } from "ws";
import WebSocket, { WebSocketServer } from "ws";

import { MdpServerRuntime } from "./mdp-server.js";

export interface MdpWebSocketServerOptions {
  host?: string;
  port?: number;
}

export class MdpWebSocketServer {
  private readonly host: string;
  private readonly port: number;
  private readonly httpServer = createServer();
  private readonly wsServer = new WebSocketServer({ server: this.httpServer });

  constructor(
    private readonly runtime: MdpServerRuntime,
    options: MdpWebSocketServerOptions = {}
  ) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 7070;
  }

  async start(): Promise<void> {
    this.wsServer.on("connection", (socket: WebSocket) => {
      const session = this.runtime.createSession(randomUUID(), socket);

      socket.on("message", (payload: RawData, isBinary: boolean) => {
        if (isBinary) {
          socket.close(1003, "Binary frames are not supported");
          return;
        }

        try {
          const message = parseMessage(payload.toString());

          if (!isClientToServer(message)) {
            socket.close(1008, "Unexpected server-directed message");
            return;
          }

          this.runtime.handleMessage(session, message);
        } catch (error) {
          socket.close(1008, error instanceof Error ? error.message : "Invalid message");
        }
      });

      socket.on("close", () => {
        this.runtime.disconnectSession(session.connectionId);
      });

      socket.on("error", () => {
        this.runtime.disconnectSession(session.connectionId);
      });
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer.once("error", reject);
      this.httpServer.listen(this.port, this.host, () => {
        this.httpServer.off("error", reject);
        resolve();
      });
    });

    this.runtime.startHeartbeat();
  }

  async stop(): Promise<void> {
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        this.wsServer.close((error?: Error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
      new Promise<void>((resolve, reject) => {
        this.httpServer.close((error?: Error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
      this.runtime.close()
    ]);
  }

  get address(): { host: string; port: number } {
    const address = this.httpServer.address();

    if (!address || typeof address === "string") {
      return {
        host: this.host,
        port: this.port
      };
    }

    return {
      host: address.address,
      port: address.port
    };
  }
}

function isClientToServer(message: unknown): message is ClientToServerMessage {
  return isMdpMessage(message) && message.type !== "callClient";
}
