import type { ClientDescriptor, ServerToClientMessage } from "@mdp/protocol";
import WebSocket from "ws";

export class ClientSession {
  readonly connectedAt = new Date();

  private _descriptor: ClientDescriptor | undefined;
  private _lastSeenAt = new Date();

  constructor(
    readonly connectionId: string,
    private readonly socket: WebSocket
  ) {}

  get descriptor(): ClientDescriptor | undefined {
    return this._descriptor;
  }

  get clientId(): string | undefined {
    return this._descriptor?.id;
  }

  get clientName(): string | undefined {
    return this._descriptor?.name;
  }

  get lastSeenAt(): Date {
    return this._lastSeenAt;
  }

  get isRegistered(): boolean {
    return this._descriptor !== undefined;
  }

  markSeen(): void {
    this._lastSeenAt = new Date();
  }

  register(descriptor: ClientDescriptor): void {
    this._descriptor = descriptor;
    this.markSeen();
  }

  unregister(): void {
    this._descriptor = undefined;
    this.markSeen();
  }

  send(message: ServerToClientMessage): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Client socket is not open");
    }

    this.socket.send(JSON.stringify(message));
    this.markSeen();
  }

  close(code = 1000, reason?: string): void {
    if (
      this.socket.readyState === WebSocket.CLOSING ||
      this.socket.readyState === WebSocket.CLOSED
    ) {
      return;
    }

    this.socket.close(code, reason);
  }
}
