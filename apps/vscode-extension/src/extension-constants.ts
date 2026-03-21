export const COMMAND_CONNECT = 'mdp.connect'
export const COMMAND_DISCONNECT = 'mdp.disconnect'
export const COMMAND_RECONNECT = 'mdp.reconnect'
export const COMMAND_SHOW_STATUS = 'mdp.showStatus'
export const OUTPUT_CHANNEL_NAME = 'MDP'

export type ExtensionControllerState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'waiting'
  | 'error'
