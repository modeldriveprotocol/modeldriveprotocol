import { randomUUID } from "node:crypto";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse
} from "node:http";
import {
  createServer as createHttpsServer,
  type Server as HttpsServer,
  type ServerOptions as HttpsServerOptions
} from "node:https";
import type { Duplex } from "node:stream";

import {
  isMdpMessage,
  type AuthContext,
  type ClientToServerMessage,
  type ServerToClientMessage
} from "@modeldriveprotocol/protocol";
import type { RawData } from "ws";
import WebSocket, { WebSocketServer } from "ws";

import { ClientSession, type ClientSessionTransport } from "./client-session.js";
import { MdpServerRuntime } from "./mdp-server.js";

const DEFAULT_HTTP_LOOP_PATH = "/mdp/http-loop";
const DEFAULT_LONG_POLL_TIMEOUT_MS = 25_000;
const DEFAULT_AUTH_HEADERS = ["authorization", "cookie"];
const SESSION_HEADER = "x-mdp-session-id";

type NodeHttpServer = HttpServer | HttpsServer;

interface HttpLoopSessionEntry {
  session: ClientSession;
  transport: HttpLoopSessionTransport;
}

export interface MdpTransportServerOptions {
  host?: string;
  port?: number;
  httpLoopPath?: string;
  longPollTimeoutMs?: number;
  tls?: HttpsServerOptions;
  authHeaders?: string[];
}

export class MdpTransportServer {
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly httpLoopPath: string;
  private readonly longPollTimeoutMs: number;
  private readonly authHeaders: string[];
  private readonly httpServer: NodeHttpServer;
  private readonly wsServer = new WebSocketServer({ noServer: true });
  private readonly httpLoopSessions = new Map<string, HttpLoopSessionEntry>();

  constructor(
    private readonly runtime: MdpServerRuntime,
    options: MdpTransportServerOptions = {}
  ) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 7070;
    this.secure = options.tls !== undefined;
    this.httpLoopPath = trimTrailingSlash(
      options.httpLoopPath ?? DEFAULT_HTTP_LOOP_PATH
    );
    this.longPollTimeoutMs =
      options.longPollTimeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS;
    this.authHeaders = (options.authHeaders ?? DEFAULT_AUTH_HEADERS).map((header) =>
      header.toLowerCase()
    );

    const requestHandler = this.handleRequest.bind(this);

    this.httpServer = options.tls
      ? createHttpsServer(options.tls, requestHandler)
      : createHttpServer(requestHandler);

    this.httpServer.on("upgrade", (request, socket, head) => {
      void this.handleUpgrade(request, socket, head);
    });
  }

  async start(): Promise<void> {
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

  get endpoints(): { ws: string; httpLoop: string } {
    const { host, port } = this.address;
    const wsProtocol = this.isSecure ? "wss" : "ws";
    const httpProtocol = this.isSecure ? "https" : "http";

    return {
      ws: `${wsProtocol}://${host}:${port}`,
      httpLoop: `${httpProtocol}://${host}:${port}${this.httpLoopPath}`
    };
  }

  private get isSecure(): boolean {
    return this.secure;
  }

  private async handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): Promise<void> {
    if (this.isHttpLoopRequest(request)) {
      socket.destroy();
      return;
    }

    this.wsServer.handleUpgrade(request, socket, head, (webSocket) => {
      const transportAuth = this.extractTransportAuth(request);
      const transport = new WebSocketSessionTransport({
        socket: webSocket,
        secure: this.isSecureRequest(request),
        ...(transportAuth ? { auth: transportAuth } : {})
      });
      const session = this.runtime.createSession(randomUUID(), transport);

      webSocket.on("message", (payload: RawData, isBinary: boolean) => {
        if (isBinary) {
          webSocket.close(1003, "Binary frames are not supported");
          return;
        }

        try {
          const message = asClientToServerMessage(JSON.parse(payload.toString()));

          if (!message) {
            webSocket.close(1008, "Unexpected server-directed message");
            return;
          }

          this.runtime.handleMessage(session, message);
        } catch (error) {
          webSocket.close(1008, error instanceof Error ? error.message : "Invalid message");
        }
      });

      webSocket.on("close", () => {
        this.runtime.disconnectSession(session.connectionId);
      });

      webSocket.on("error", () => {
        this.runtime.disconnectSession(session.connectionId);
      });
    });
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const url = this.requestUrl(request);

    if (!url.pathname.startsWith(this.httpLoopPath)) {
      response.statusCode = 404;
      response.end();
      return;
    }

    this.applyHttpLoopCors(request, response);

    try {
      if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
      }

      if (request.method === "POST" && url.pathname === `${this.httpLoopPath}/connect`) {
        await this.handleHttpLoopConnect(request, response);
        return;
      }

      if (request.method === "POST" && url.pathname === `${this.httpLoopPath}/send`) {
        await this.handleHttpLoopSend(request, response, url);
        return;
      }

      if (request.method === "GET" && url.pathname === `${this.httpLoopPath}/poll`) {
        await this.handleHttpLoopPoll(request, response, url);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === `${this.httpLoopPath}/disconnect`
      ) {
        await this.handleHttpLoopDisconnect(request, response, url);
        return;
      }

      response.statusCode = 404;
      response.end();
    } catch (error) {
      this.writeJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid HTTP loop request"
      });
    }
  }

  private async handleHttpLoopConnect(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    await readJsonBody(request);

    const connectionId = randomUUID();
    const transportAuth = this.extractTransportAuth(request);
    const transport = new HttpLoopSessionTransport({
      secure: this.isSecureRequest(request),
      ...(transportAuth ? { auth: transportAuth } : {})
    });
    const session = this.runtime.createSession(connectionId, transport);

    transport.onClose(() => {
      this.httpLoopSessions.delete(connectionId);
    });

    this.httpLoopSessions.set(connectionId, {
      session,
      transport
    });

    this.writeJson(response, 200, {
      sessionId: connectionId
    });
  }

  private async handleHttpLoopSend(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL
  ): Promise<void> {
    const entry = this.getHttpLoopSession(request, url);

    if (!entry) {
      response.statusCode = 404;
      response.end();
      return;
    }

    entry.session.setTransportAuth(this.extractTransportAuth(request));
    entry.session.markSeen();

    const body = (await readJsonBody(request)) as { message?: unknown };
    const message = asClientToServerMessage(body.message);

    if (!message) {
      throw new Error("Invalid MDP client message");
    }

    try {
      this.runtime.handleMessage(entry.session, message);
    } catch (error) {
      this.runtime.disconnectSession(entry.session.connectionId);
      throw error;
    }

    this.writeJson(response, 202, {
      ok: true
    });
  }

  private async handleHttpLoopPoll(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL
  ): Promise<void> {
    const entry = this.getHttpLoopSession(request, url);

    if (!entry) {
      response.statusCode = 404;
      response.end();
      return;
    }

    entry.session.setTransportAuth(this.extractTransportAuth(request));
    entry.session.markSeen();

    const waitMs = clampWaitMs(
      Number(url.searchParams.get("waitMs") ?? this.longPollTimeoutMs),
      this.longPollTimeoutMs
    );
    const message = await entry.transport.poll(waitMs);

    if (!message) {
      response.statusCode = 204;
      response.end();
      return;
    }

    this.writeJson(response, 200, {
      message
    });
  }

  private async handleHttpLoopDisconnect(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL
  ): Promise<void> {
    const entry = this.getHttpLoopSession(request, url);

    if (entry) {
      this.runtime.disconnectSession(entry.session.connectionId);
    }

    response.statusCode = 204;
    response.end();
  }

  private getHttpLoopSession(
    request: IncomingMessage,
    url: URL
  ): HttpLoopSessionEntry | undefined {
    const sessionId = readSessionId(request, url);

    if (!sessionId) {
      return undefined;
    }

    return this.httpLoopSessions.get(sessionId);
  }

  private writeJson(
    response: ServerResponse,
    statusCode: number,
    payload: Record<string, unknown>
  ): void {
    response.statusCode = statusCode;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(payload));
  }

  private applyHttpLoopCors(
    request: IncomingMessage,
    response: ServerResponse
  ): void {
    const origin = request.headers.origin;

    if (typeof origin === "string" && origin.length > 0) {
      response.setHeader("access-control-allow-origin", origin);
      appendVaryHeader(response, "Origin");
      response.setHeader("access-control-allow-credentials", "true");
    } else {
      response.setHeader("access-control-allow-origin", "*");
    }

    const requestedHeaders = request.headers["access-control-request-headers"];
    const allowHeaders =
      typeof requestedHeaders === "string" && requestedHeaders.length > 0
        ? requestedHeaders
        : defaultCorsAllowedHeaders(this.authHeaders);

    response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    response.setHeader("access-control-allow-headers", allowHeaders);
  }

  private requestUrl(request: IncomingMessage): URL {
    const protocol = this.isSecureRequest(request) ? "https" : "http";

    return new URL(
      request.url ?? "/",
      `${protocol}://${request.headers.host ?? `${this.host}:${this.port}`}`
    );
  }

  private isHttpLoopRequest(request: IncomingMessage): boolean {
    return this.requestUrl(request).pathname.startsWith(this.httpLoopPath);
  }

  private isSecureRequest(request: IncomingMessage): boolean {
    return "encrypted" in request.socket && Boolean(request.socket.encrypted);
  }

  private extractTransportAuth(request: IncomingMessage): AuthContext | undefined {
    const headers: Record<string, string> = {};

    for (const header of this.authHeaders) {
      const value = request.headers[header];

      if (typeof value === "string") {
        headers[header] = value;
      } else if (Array.isArray(value)) {
        headers[header] = value.join(", ");
      }
    }

    for (const [name, value] of Object.entries(request.headers)) {
      if (!name.startsWith("x-mdp-auth-")) {
        continue;
      }

      if (typeof value === "string") {
        headers[name] = value;
      } else if (Array.isArray(value)) {
        headers[name] = value.join(", ");
      }
    }

    const authorization = headers.authorization;
    const auth: AuthContext = {};

    if (authorization) {
      const [scheme, ...tokenParts] = authorization.split(/\s+/);

      if (scheme && tokenParts.length > 0) {
        auth.scheme = scheme;
        auth.token = tokenParts.join(" ");
      } else {
        auth.token = authorization;
      }
    }

    if (Object.keys(headers).length > 0) {
      auth.headers = headers;
    }

    return Object.keys(auth).length > 0 ? auth : undefined;
  }
}

interface WebSocketSessionTransportOptions {
  socket: WebSocket;
  secure: boolean;
  auth?: AuthContext;
}

class WebSocketSessionTransport implements ClientSessionTransport {
  readonly mode = "ws" as const;
  readonly secure: boolean;
  readonly auth: AuthContext | undefined;
  private readonly socket: WebSocket;

  constructor(options: WebSocketSessionTransportOptions) {
    this.secure = options.secure;
    this.auth = options.auth;
    this.socket = options.socket;
  }

  isOpen(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  send(message: ServerToClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  close(code?: number, reason?: string): void {
    if (
      this.socket.readyState === WebSocket.CLOSING ||
      this.socket.readyState === WebSocket.CLOSED
    ) {
      return;
    }

    this.socket.close(code, reason);
  }
}

interface HttpLoopSessionTransportOptions {
  secure: boolean;
  auth?: AuthContext;
}

class HttpLoopSessionTransport implements ClientSessionTransport {
  readonly mode = "http-loop" as const;
  readonly secure: boolean;
  readonly auth: AuthContext | undefined;

  private readonly queue: ServerToClientMessage[] = [];
  private pendingPoll:
    | {
        resolve: (message?: ServerToClientMessage) => void;
        timer: NodeJS.Timeout;
      }
    | undefined;
  private closed = false;
  private closeHandler: (() => void) | undefined;

  constructor(options: HttpLoopSessionTransportOptions) {
    this.secure = options.secure;
    this.auth = options.auth;
  }

  isOpen(): boolean {
    return !this.closed;
  }

  send(message: ServerToClientMessage): void {
    if (this.closed) {
      throw new Error("HTTP loop session is closed");
    }

    if (this.pendingPoll) {
      const { resolve, timer } = this.pendingPoll;
      clearTimeout(timer);
      this.pendingPoll = undefined;
      resolve(message);
      return;
    }

    this.queue.push(message);
  }

  async poll(waitMs: number): Promise<ServerToClientMessage | undefined> {
    if (this.queue.length > 0) {
      return this.queue.shift();
    }

    if (this.closed) {
      return undefined;
    }

    if (this.pendingPoll) {
      const { resolve, timer } = this.pendingPoll;
      clearTimeout(timer);
      resolve(undefined);
      this.pendingPoll = undefined;
    }

    return new Promise<ServerToClientMessage | undefined>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingPoll?.timer === timer) {
          this.pendingPoll = undefined;
        }

        resolve(undefined);
      }, waitMs);

      timer.unref?.();

      this.pendingPoll = {
        resolve,
        timer
      };
    });
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.pendingPoll) {
      const { resolve, timer } = this.pendingPoll;
      clearTimeout(timer);
      this.pendingPoll = undefined;
      resolve(undefined);
    }

    this.closeHandler?.();
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function asClientToServerMessage(value: unknown): ClientToServerMessage | undefined {
  if (!isMdpMessage(value) || value.type === "callClient") {
    return undefined;
  }

  return value;
}

function readSessionId(request: IncomingMessage, url: URL): string | undefined {
  const headerValue = request.headers[SESSION_HEADER];

  if (typeof headerValue === "string") {
    return headerValue;
  }

  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? undefined;
  }

  return url.searchParams.get("sessionId") ?? undefined;
}

function clampWaitMs(candidate: number, fallback: number): number {
  if (!Number.isFinite(candidate) || candidate <= 0) {
    return fallback;
  }

  return Math.min(candidate, 60_000);
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function defaultCorsAllowedHeaders(authHeaders: string[]): string {
  return ["content-type", SESSION_HEADER, ...authHeaders].join(", ");
}

function appendVaryHeader(response: ServerResponse, value: string): void {
  const existing = response.getHeader("vary");

  if (typeof existing !== "string" || existing.length === 0) {
    response.setHeader("vary", value);
    return;
  }

  const values = existing
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!values.includes(value)) {
    values.push(value);
  }

  response.setHeader("vary", values.join(", "));
}
