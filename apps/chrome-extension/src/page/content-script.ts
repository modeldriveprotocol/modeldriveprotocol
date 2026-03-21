import {
  MAIN_WORLD_REQUEST_EVENT,
  MAIN_WORLD_RESPONSE_EVENT,
  PAGE_COMMAND_CHANNEL,
  type MainWorldAction,
  type MainWorldRequest,
  type MainWorldResponse,
  type PageCommand,
  type PageCommandEnvelope,
  type PageCommandResponse,
  type PageElementSummary,
  type PageSnapshot
} from "./messages.js";
import {
  countVisibleElements,
  queryVisibleElements
} from "./visibility.js";
import {
  createRequestId,
  describeUrlMatchCondition,
  matchesUrlCondition,
  normalizeForMessaging,
  serializeError,
  truncateText
} from "../shared/utils.js";

declare global {
  interface Window {
    __MDP_CONTENT_SCRIPT_INSTALLED__?: boolean;
  }
}

if (!window.__MDP_CONTENT_SCRIPT_INSTALLED__) {
  window.__MDP_CONTENT_SCRIPT_INSTALLED__ = true;

  chrome.runtime.onMessage.addListener(
    (
      message: PageCommandEnvelope | undefined,
      _sender: unknown,
      sendResponse: (response: PageCommandResponse) => void
    ) => {
      if (!message || message.channel !== PAGE_COMMAND_CHANNEL) {
        return undefined;
      }

      void handlePageCommand(message.command)
        .then((data) => {
          sendResponse({
            ok: true,
            data: normalizeForMessaging(data)
          });
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: serializeError(error)
          });
        });

      return true;
    }
  );
}

async function handlePageCommand(command: PageCommand): Promise<unknown> {
  switch (command.type) {
    case "ping":
      return {
        ok: true,
        title: document.title,
        url: location.href
      };
    case "getSnapshot":
      return buildPageSnapshot(command.maxTextLength ?? 4000);
    case "queryElements":
      return queryElements(command.selector, command.maxResults ?? 20);
    case "click":
      return clickElement(command.selector, command.index ?? 0);
    case "fill":
      return fillElement(command.selector, command.value, command.index ?? 0);
    case "focus":
      return focusElement(command.selector, command.index ?? 0);
    case "pressKey":
      return pressKey(command);
    case "scrollIntoView":
      return scrollElementIntoView(command);
    case "scrollTo":
      return scrollToPosition(command.top, command.left, command.behavior ?? "auto");
    case "waitForText":
      return waitForText(command.text, command.timeoutMs ?? 10_000);
    case "waitForSelector":
      return waitForSelector(command.selector, command.timeoutMs ?? 10_000);
    case "waitForVisible":
      return waitForVisible(command);
    case "waitForHidden":
      return waitForHidden(command);
    case "waitForUrl":
      return waitForUrl(command);
    case "runMainWorld":
      return callMainWorld(command.action, command.args, command.timeoutMs ?? 10_000);
  }
}

function buildPageSnapshot(maxTextLength: number): PageSnapshot {
  const selection = window.getSelection()?.toString().trim() ?? "";
  const headings = [...document.querySelectorAll("h1, h2, h3")]
    .map((element) => element.textContent?.trim() ?? "")
    .filter((text) => text.length > 0)
    .slice(0, 10);

  return {
    title: document.title,
    url: location.href,
    language: document.documentElement.lang || navigator.language,
    readyState: document.readyState,
    selection,
    headings,
    bodyText: truncateText(document.body?.innerText?.trim() ?? "", maxTextLength)
  };
}

function queryElements(selector: string, maxResults: number): PageElementSummary[] {
  if (!selector.trim()) {
    throw new Error("Selector is required");
  }

  return [...document.querySelectorAll(selector)]
    .slice(0, maxResults)
    .map((element, index) => serializeElement(element, index));
}

function clickElement(selector: string, index: number): { clicked: boolean; target: PageElementSummary } {
  const element = resolveElement(selector, index);

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Selector "${selector}" did not resolve to an HTMLElement`);
  }

  element.scrollIntoView({
    behavior: "auto",
    block: "center",
    inline: "center"
  });
  element.click();

  return {
    clicked: true,
    target: serializeElement(element, index)
  };
}

function fillElement(
  selector: string,
  value: string,
  index: number
): { filled: boolean; target: PageElementSummary } {
  const element = resolveElement(selector, index);

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      element.checked = value === "true";
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    return {
      filled: true,
      target: serializeElement(element, index)
    };
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    element.focus();
    element.textContent = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));

    return {
      filled: true,
      target: serializeElement(element, index)
    };
  }

  throw new Error(`Selector "${selector}" did not resolve to a fillable element`);
}

function focusElement(
  selector: string,
  index: number
): { focused: true; target: PageElementSummary } {
  const element = resolveElement(selector, index);

  if (!("focus" in element) || typeof element.focus !== "function") {
    throw new Error(`Selector "${selector}" did not resolve to a focusable element`);
  }

  element.focus();

  return {
    focused: true,
    target: serializeElement(element, index)
  };
}

function pressKey(command: Extract<PageCommand, { type: "pressKey" }>): {
  pressed: boolean;
  key: string;
  target: string;
} {
  if (!command.key.trim()) {
    throw new Error("key is required");
  }

  const target =
    command.selector && command.selector.trim()
      ? resolveElement(command.selector, 0)
      : document.activeElement ?? document.body;

  if (target instanceof HTMLElement) {
    target.focus();
  }

  const init = {
    key: command.key,
    code: command.code ?? command.key,
    bubbles: true,
    cancelable: true,
    altKey: command.altKey ?? false,
    ctrlKey: command.ctrlKey ?? false,
    metaKey: command.metaKey ?? false,
    shiftKey: command.shiftKey ?? false
  };

  target.dispatchEvent(new KeyboardEvent("keydown", init));
  target.dispatchEvent(new KeyboardEvent("keyup", init));

  return {
    pressed: true,
    key: command.key,
    target:
      target instanceof Element
        ? target.tagName.toLowerCase()
        : target === document.body
          ? "body"
          : "document"
  };
}

function scrollToPosition(
  top: number | undefined,
  left: number | undefined,
  behavior: "auto" | "smooth"
): { top: number; left: number; behavior: "auto" | "smooth" } {
  window.scrollTo({
    top: top ?? window.scrollY,
    left: left ?? window.scrollX,
    behavior
  });

  return {
    top: top ?? window.scrollY,
    left: left ?? window.scrollX,
    behavior
  };
}

function scrollElementIntoView(
  command: Extract<PageCommand, { type: "scrollIntoView" }>
): {
  scrolled: true;
  behavior: "auto" | "smooth";
  block: "start" | "center" | "end" | "nearest";
  inline: "start" | "center" | "end" | "nearest";
  target: PageElementSummary;
} {
  const index = command.index ?? 0;
  const element = resolveElement(command.selector, index);
  const behavior = command.behavior ?? "auto";
  const block = command.block ?? "center";
  const inline = command.inline ?? "nearest";

  element.scrollIntoView({
    behavior,
    block,
    inline
  });

  return {
    scrolled: true,
    behavior,
    block,
    inline,
    target: serializeElement(element, index)
  };
}

function waitForText(
  text: string,
  timeoutMs: number
): Promise<{ found: true; text: string; elapsedMs: number }> {
  if (!text.trim()) {
    throw new Error("text is required");
  }

  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if ((document.body?.innerText ?? "").includes(text)) {
        cleanup();
        resolve({
          found: true,
          text,
          elapsedMs: Date.now() - startedAt
        });
      }
    };

    const interval = window.setInterval(check, 200);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for text "${text}"`));
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      check();
    });

    const cleanup = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      observer.disconnect();
    };

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    check();
  });
}

function waitForSelector(
  selector: string,
  timeoutMs: number
): Promise<{ found: true; selector: string; elapsedMs: number }> {
  if (!selector.trim()) {
    throw new Error("selector is required");
  }

  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (document.querySelector(selector)) {
        cleanup();
        resolve({
          found: true,
          selector,
          elapsedMs: Date.now() - startedAt
        });
      }
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for selector "${selector}"`));
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      check();
    });

    const cleanup = () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });

    check();
  });
}

function waitForVisible(
  command: Extract<PageCommand, { type: "waitForVisible" }>
): Promise<{
  found: true;
  selector: string;
  index: number;
  elapsedMs: number;
  target: PageElementSummary;
}> {
  if (!command.selector.trim()) {
    throw new Error("selector is required");
  }

  const index = command.index ?? 0;
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const visibleElements = queryVisibleElements(document, command.selector);
      const element = visibleElements.at(index);

      if (element) {
        cleanup();
        resolve({
          found: true,
          selector: command.selector,
          index,
          elapsedMs: Date.now() - startedAt,
          target: serializeElement(element, index)
        });
      }
    };

    const interval = window.setInterval(check, 150);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out waiting for visible selector "${command.selector}" at visible index ${index}`
        )
      );
    }, command.timeoutMs ?? 10_000);

    const observer = new MutationObserver(() => {
      check();
    });

    const cleanup = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      observer.disconnect();
    };

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });

    check();
  });
}

function waitForHidden(
  command: Extract<PageCommand, { type: "waitForHidden" }>
): Promise<{
  hidden: true;
  selector: string;
  elapsedMs: number;
  totalMatches: number;
  visibleMatches: number;
}> {
  if (!command.selector.trim()) {
    throw new Error("selector is required");
  }

  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const counts = countVisibleElements(document, command.selector);

      if (counts.visibleMatches === 0) {
        cleanup();
        resolve({
          hidden: true,
          selector: command.selector,
          elapsedMs: Date.now() - startedAt,
          totalMatches: counts.totalMatches,
          visibleMatches: counts.visibleMatches
        });
      }
    };

    const interval = window.setInterval(check, 150);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for hidden selector "${command.selector}"`));
    }, command.timeoutMs ?? 10_000);

    const observer = new MutationObserver(() => {
      check();
    });

    const cleanup = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      observer.disconnect();
    };

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });

    check();
  });
}

function waitForUrl(
  command: Extract<PageCommand, { type: "waitForUrl" }>
): Promise<{ found: true; url: string; elapsedMs: number }> {
  const condition = {
    ...(command.url ? { url: command.url } : {}),
    ...(command.includes ? { includes: command.includes } : {}),
    ...(command.matches ? { matches: command.matches } : {})
  };
  const description = describeUrlMatchCondition(condition);
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const currentUrl = location.href;

      if (matchesUrlCondition(currentUrl, condition)) {
        cleanup();
        resolve({
          found: true,
          url: currentUrl,
          elapsedMs: Date.now() - startedAt
        });
      }
    };

    const interval = window.setInterval(check, 100);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${description}`));
    }, command.timeoutMs ?? 10_000);

    const cleanup = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener("hashchange", check);
      window.removeEventListener("popstate", check);
    };

    window.addEventListener("hashchange", check);
    window.addEventListener("popstate", check);

    check();
  });
}

function resolveElement(selector: string, index: number): Element {
  if (!selector.trim()) {
    throw new Error("Selector is required");
  }

  const elements = document.querySelectorAll(selector);
  const element = elements.item(index);

  if (!element) {
    throw new Error(`No element found for selector "${selector}" at index ${index}`);
  }

  return element;
}

function serializeElement(element: Element, index: number): PageElementSummary {
  const htmlElement = element as HTMLElement;
  const inputElement = element as HTMLInputElement;

  return {
    index,
    tagName: element.tagName.toLowerCase(),
    ...(element.id ? { id: element.id } : {}),
    classes: [...element.classList],
    text: truncateText(htmlElement.innerText?.trim() ?? element.textContent?.trim() ?? "", 280),
    ...(typeof inputElement.value === "string" && inputElement.value.length > 0
      ? { value: truncateText(inputElement.value, 160) }
      : {}),
    ...(element instanceof HTMLAnchorElement && element.href ? { href: element.href } : {}),
    ...(element instanceof HTMLInputElement && element.type === "checkbox"
      ? { checked: element.checked }
      : {}),
    ...(htmlElement instanceof HTMLElement ? { disabled: htmlElement.matches(":disabled") } : {})
  };
}

function callMainWorld(
  action: MainWorldAction,
  args: unknown,
  timeoutMs: number
): Promise<unknown> {
  const requestId = createRequestId("page");

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for main world action "${action}"`));
    }, timeoutMs);

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<MainWorldResponse>).detail;

      if (!detail || detail.requestId !== requestId) {
        return;
      }

      cleanup();

      if (!detail.ok) {
        reject(new Error(detail.error?.message ?? "Main world action failed"));
        return;
      }

      resolve(detail.data);
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener(MAIN_WORLD_RESPONSE_EVENT, listener as EventListener);
    };

    window.addEventListener(MAIN_WORLD_RESPONSE_EVENT, listener as EventListener);

    const detail: MainWorldRequest = {
      requestId,
      action,
      ...(args !== undefined ? { args } : {})
    };

    window.dispatchEvent(
      new CustomEvent(MAIN_WORLD_REQUEST_EVENT, {
        detail
      })
    );
  });
}
