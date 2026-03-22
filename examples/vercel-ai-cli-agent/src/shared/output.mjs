export function extractFinalText(result) {
  if (typeof result.text === 'string' && result.text.trim()) {
    return result.text.trim()
  }

  for (const part of result.content ?? []) {
    if (part?.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
      return part.text.trim()
    }
  }

  return '未生成结果。'
}

export function compactLogs(entries) {
  return entries
    .map(([label, content]) => {
      const trimmed = content.trim()
      return trimmed ? `[${label}]\n${trimmed}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
