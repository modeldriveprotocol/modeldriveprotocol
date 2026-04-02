import { randomUUID } from 'node:crypto'

import type {
  AuthContext,
  CallClientResultMessage,
  HttpMethod,
  JsonValue,
  PathNodeKind,
  RpcArguments
} from '@modeldriveprotocol/protocol'

import type { ClientSession } from './client-session.js'

export interface InvocationRequest {
  clientId: string
  method: HttpMethod
  path: string
  query?: RpcArguments
  body?: JsonValue
  headers?: Record<string, string>
  auth?: AuthContext
}

export interface ResolvedInvocationRequest extends InvocationRequest {
  type: PathNodeKind
  params: RpcArguments
}

interface PendingInvocation {
  clientId: string
  timeout: NodeJS.Timeout
  resolve: (result: CallClientResultMessage) => void
  reject: (error: Error) => void
}

export class InvocationRouter {
  private readonly pending = new Map<string, PendingInvocation>()

  constructor(
    private readonly getSession: (clientId: string) => ClientSession | undefined,
    private readonly timeoutMs: number
  ) {}

  invoke(request: ResolvedInvocationRequest): Promise<CallClientResultMessage> {
    const session = this.getSession(request.clientId)

    if (!session) {
      throw new Error(`Client "${request.clientId}" is not connected`)
    }

    const requestId = randomUUID()

    return new Promise<CallClientResultMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`Invocation timed out for client "${request.clientId}"`))
      }, this.timeoutMs)

      this.pending.set(requestId, {
        clientId: request.clientId,
        timeout,
        resolve,
        reject
      })

      try {
        session.send({
          type: 'callClient',
          requestId,
          clientId: request.clientId,
          method: request.method,
          path: request.path,
          params: request.params,
          ...(request.query ? { query: request.query } : {}),
          ...(request.body !== undefined ? { body: request.body } : {}),
          ...(request.headers ? { headers: request.headers } : {}),
          ...(request.auth ? { auth: request.auth } : {})
        })
      } catch (error) {
        clearTimeout(timeout)
        this.pending.delete(requestId)
        reject(asError(error))
      }
    })
  }

  resolve(result: CallClientResultMessage): boolean {
    const pending = this.pending.get(result.requestId)

    if (!pending) {
      return false
    }

    clearTimeout(pending.timeout)
    this.pending.delete(result.requestId)
    pending.resolve(result)
    return true
  }

  rejectClient(clientId: string, error: Error): void {
    for (const [requestId, pending] of this.pending.entries()) {
      if (pending.clientId !== clientId) {
        continue
      }

      clearTimeout(pending.timeout)
      this.pending.delete(requestId)
      pending.reject(error)
    }
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
