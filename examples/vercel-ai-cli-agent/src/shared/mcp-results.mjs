export function unwrapMcpToolResult(result) {
  if (!result || typeof result !== 'object') {
    return undefined
  }

  if ('structuredContent' in result && result.structuredContent !== undefined) {
    return result.structuredContent
  }

  if ('toolResult' in result && result.toolResult !== undefined) {
    return result.toolResult
  }

  if (
    'content' in result
    && Array.isArray(result.content)
    && result.content[0]
    && typeof result.content[0] === 'object'
    && result.content[0]?.type === 'text'
    && typeof result.content[0]?.text === 'string'
  ) {
    try {
      return JSON.parse(result.content[0].text)
    }
    catch {
      return result.content[0].text
    }
  }

  return result
}
