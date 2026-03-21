export function isElementVisible(element: Element): boolean {
  if (!element.isConnected) {
    return false;
  }

  for (let current: Element | null = element; current; current = current.parentElement) {
    if (current.hasAttribute("hidden")) {
      return false;
    }

    const style = current.ownerDocument.defaultView?.getComputedStyle(current);

    if (!style) {
      continue;
    }

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.opacity === "0"
    ) {
      return false;
    }
  }

  return true;
}

export function queryVisibleElements(root: ParentNode, selector: string): Element[] {
  if (!selector.trim()) {
    throw new Error("Selector is required");
  }

  return [...root.querySelectorAll(selector)].filter((element) => isElementVisible(element));
}

export function countVisibleElements(
  root: ParentNode,
  selector: string
): {
  totalMatches: number;
  visibleMatches: number;
} {
  if (!selector.trim()) {
    throw new Error("Selector is required");
  }

  const matches = [...root.querySelectorAll(selector)];

  return {
    totalMatches: matches.length,
    visibleMatches: matches.filter((element) => isElementVisible(element)).length
  };
}
