export function mergeExpandedFolderPaths(
  current: string[],
  nextPaths: string[]
): string[] {
  const merged = [...new Set([...current, ...nextPaths])]

  return merged.length === current.length &&
    merged.every((path, index) => path === current[index])
    ? current
    : merged
}

