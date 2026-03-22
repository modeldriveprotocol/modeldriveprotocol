#!/usr/bin/env node

import process from 'node:process'

import { main } from './src/cli/main.mjs'

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
