import type {
  AuthContext,
  ClientConnectionDescriptor,
  ClientConnectionMode,
  ClientDescriptor,
  ServerToClientMessage
} from '@modeldriveprotocol/protocol'

export interface ClientSessionTransport {
  readonly mode: ClientConnectionMode
  readonly secure: boolean
  readonly auth: AuthContext | undefined
  isOpen(): boolean
  send(message: ServerToClientMessage): void
  close(code?: number, reason?: string): void
}

export class ClientSession {
  readonly connectedAt = new Date()

  private _descriptor: ClientDescriptor | undefined
  private _transportAuth: AuthContext | undefined
  private _registeredAuth: AuthContext | undefined
  private _lastSeenAt = new Date()

  constructor(
    readonly connectionId: string,
    private readonly transport: ClientSessionTransport
  ) {
    this._transportAuth = transport.auth
  }

  get descriptor(): ClientDescriptor | undefined {
    return this._descriptor
  }

  get clientId(): string | undefined {
    return this._descriptor?.id
  }

  get clientName(): string | undefined {
    return this._descriptor?.name
  }

  get lastSeenAt(): Date {
    return this._lastSeenAt
  }

  get isRegistered(): boolean {
    return this._descriptor !== undefined
  }

  get transportAuth(): AuthContext | undefined {
    return this._transportAuth
  }

  get registeredAuth(): AuthContext | undefined {
    return this._registeredAuth
  }

  get connection(): ClientConnectionDescriptor {
    return {
      mode: this.transport.mode,
      secure: this.transport.secure,
      authSource: resolveAuthSource(this._transportAuth, this._registeredAuth)
    }
  }

  markSeen(): void {
    this._lastSeenAt = new Date()
  }

  setTransportAuth(auth?: AuthContext): void {
    this._transportAuth = auth
  }

  register(descriptor: ClientDescriptor, auth?: AuthContext): void {
    this._descriptor = descriptor
    this._registeredAuth = auth
    this.markSeen()
  }

  unregister(): void {
    this._descriptor = undefined
    this._registeredAuth = undefined
    this.markSeen()
  }

  send(message: ServerToClientMessage): void {
    if (!this.transport.isOpen()) {
      throw new Error('Client transport is not open')
    }

    this.transport.send(message)
  }

  close(code = 1000, reason?: string): void {
    this.transport.close(code, reason)
  }
}

function resolveAuthSource(
  transportAuth: AuthContext | undefined,
  registeredAuth: AuthContext | undefined
): ClientConnectionDescriptor['authSource'] {
  if (transportAuth && registeredAuth) {
    return 'transport+message'
  }

  if (registeredAuth) {
    return 'message'
  }

  if (transportAuth) {
    return 'transport'
  }

  return 'none'
}
