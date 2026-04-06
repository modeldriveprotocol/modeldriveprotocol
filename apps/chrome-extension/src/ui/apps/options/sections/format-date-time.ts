export function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'numeric',
    day: 'numeric'
  })
}

export function formatTimeLabel(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}
