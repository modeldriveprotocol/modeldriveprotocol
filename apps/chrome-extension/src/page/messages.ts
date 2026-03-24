import type { SerializedError } from '#~/shared/utils.js'

export const PAGE_COMMAND_CHANNEL = 'mdp-chrome-extension:page-command'
export const MAIN_WORLD_REQUEST_EVENT = 'mdp-chrome-extension:main-request'
export const MAIN_WORLD_RESPONSE_EVENT = 'mdp-chrome-extension:main-response'
export const MAIN_WORLD_READY_EVENT = 'mdp-chrome-extension:main-ready'

export interface InjectedToolDescriptor {
  name: string
  description?: string
}

export interface MainWorldBridgeState {
  bridgeInstalled: true
  tools: InjectedToolDescriptor[]
  executedScriptIds: string[]
}

export interface PageElementSummary {
  index: number
  tagName: string
  id?: string
  classes: string[]
  text: string
  value?: string
  href?: string
  checked?: boolean
  disabled?: boolean
}

export interface PageSnapshot {
  title: string
  url: string
  language: string
  readyState: DocumentReadyState
  selection: string
  headings: string[]
  bodyText: string
}

export interface PageRecordedAction {
  id: string
  type: 'click' | 'fill' | 'pressKey'
  selector: string
  alternativeSelectors: string[]
  tagName: string
  classes: string[]
  timestampOffsetMs: number
  text?: string
  label?: string
  inputType?: string
  value?: string
  key?: string
  code?: string
}

export interface PageRecordingState {
  active: boolean
  startedAt?: string
  stepCount: number
}

export interface PageRecordingResult {
  startedAt: string
  finishedAt: string
  url: string
  title: string
  steps: PageRecordedAction[]
  capturedFeatures: string[]
}

export interface PageSelectorCaptureResult {
  selector: string
  alternativeSelectors: string[]
  tagName: string
  classes: string[]
  text?: string
  attributes: Record<string, string>
  url: string
}

export interface PageSelectorCaptureState {
  active: boolean
}

export type MainWorldAction = 'listTools' | 'invokeTool' | 'runScript' | 'getState'

export interface MainWorldRequest {
  requestId: string
  action: MainWorldAction
  args?: unknown
}

export interface MainWorldResponse {
  requestId: string
  ok: boolean
  data?: unknown
  error?: SerializedError
}

export type PageCommand =
  | {
      type: 'ping'
    }
  | {
      type: 'getSnapshot'
      maxTextLength?: number
    }
  | {
      type: 'queryElements'
      selector: string
      maxResults?: number
    }
  | {
      type: 'click'
      selector: string
      index?: number
    }
  | {
      type: 'fill'
      selector: string
      value: string
      index?: number
    }
  | {
      type: 'focus'
      selector: string
      index?: number
    }
  | {
      type: 'pressKey'
      key: string
      code?: string
      selector?: string
      altKey?: boolean
      ctrlKey?: boolean
      metaKey?: boolean
      shiftKey?: boolean
    }
  | {
      type: 'scrollIntoView'
      selector: string
      index?: number
      behavior?: 'auto' | 'smooth'
      block?: 'start' | 'center' | 'end' | 'nearest'
      inline?: 'start' | 'center' | 'end' | 'nearest'
    }
  | {
      type: 'scrollTo'
      top?: number
      left?: number
      behavior?: 'auto' | 'smooth'
    }
  | {
      type: 'waitForText'
      text: string
      timeoutMs?: number
    }
  | {
      type: 'waitForSelector'
      selector: string
      timeoutMs?: number
    }
  | {
      type: 'waitForVisible'
      selector: string
      index?: number
      timeoutMs?: number
    }
  | {
      type: 'waitForHidden'
      selector: string
      timeoutMs?: number
    }
  | {
      type: 'waitForUrl'
      url?: string
      includes?: string
      matches?: string
      timeoutMs?: number
    }
  | {
      type: 'runMainWorld'
      action: MainWorldAction
      args?: unknown
      timeoutMs?: number
    }
  | {
      type: 'startRecording'
    }
  | {
      type: 'stopRecording'
    }
  | {
      type: 'getRecordingState'
    }
  | {
      type: 'startSelectorCapture'
    }
  | {
      type: 'cancelSelectorCapture'
    }
  | {
      type: 'getSelectorCaptureState'
    }

export interface PageCommandEnvelope {
  channel: typeof PAGE_COMMAND_CHANNEL
  command: PageCommand
}

export interface PageCommandResponse<TResult = unknown> {
  ok: boolean
  data?: TResult
  error?: SerializedError
}
