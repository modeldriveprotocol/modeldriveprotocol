import { describe, expect, it } from 'vitest'

import { renderHelpText } from '../src/cli-reference.js'
import { parseArgs } from '../src/cli.js'
import { parseSetupArgs, renderSetupHelpText } from '../src/setup.js'

describe('server cli', () => {
  it('parses defaults for clustered auto mode', () => {
    expect(parseArgs([])).toEqual({
      helpRequested: false,
      portProvided: false,
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100
      }
    })
  })

  it('keeps the preferred hub port in parsed options when clustered port is omitted', () => {
    expect(parseArgs(['--cluster-mode', 'auto'])).toEqual({
      helpRequested: false,
      portProvided: false,
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100
      }
    })
  })

  it('keeps an explicitly provided port in clustered modes', () => {
    expect(parseArgs(['--cluster-mode', 'proxy-required', '--port', '47170'])).toEqual({
      helpRequested: false,
      portProvided: true,
      options: {
        host: '127.0.0.1',
        port: 47170,
        clusterMode: 'proxy-required',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100
      }
    })
  })

  it('marks help requests without mutating defaults', () => {
    expect(parseArgs(['--help'])).toEqual({
      helpRequested: true,
      portProvided: false,
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100
      }
    })
  })

  it('throws for unknown flags and missing option values', () => {
    expect(() => {
      parseArgs(['--unknown'])
    }).toThrow('Unknown option: --unknown')

    expect(() => {
      parseArgs(['--upstream-url'])
    }).toThrow('Option --upstream-url requires a value')
  })

  it('rejects invalid numeric option values', () => {
    expect(() => {
      parseArgs(['--port', 'abc'])
    }).toThrow('Option --port requires a valid port number')

    expect(() => {
      parseArgs(['--discover-start-port', '70000'])
    }).toThrow('Option --discover-start-port requires a valid port number')

    expect(() => {
      parseArgs(['--discover-attempts', '0'])
    }).toThrow('Option --discover-attempts requires a positive integer')
  })

  it('renders help text that documents clustered startup', () => {
    const help = renderHelpText()

    expect(help).toContain('Usage: modeldriveprotocol-server [options]')
    expect(help).toContain('modeldriveprotocol-server setup [options]')
    expect(help).toContain('Commands:')
    expect(help).toContain('Configure supported agent and IDE MCP hosts')
    expect(help).toContain('--cluster-mode <standalone|auto|proxy-required>')
    expect(help).toContain('--upstream-url <ws-url>')
    expect(help).toContain('--discover-attempts <count>')
    expect(help).toContain('--server-id <id>')
  })

  it('parses setup defaults and renders setup help', () => {
    expect(parseSetupArgs([])).toEqual({
      helpRequested: false,
      options: {
        scope: 'user',
        targets: ['claude', 'codex', 'cursor'],
        name: 'mdp',
        dryRun: false
      }
    })

    expect(renderSetupHelpText()).toContain('Usage: modeldriveprotocol-server setup [options]')
    expect(renderSetupHelpText()).toContain('--scope <scope>')
  })
})
