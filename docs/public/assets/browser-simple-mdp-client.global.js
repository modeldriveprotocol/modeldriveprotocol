/* Model Drive Protocol simple browser client */
"use strict";
var MDPSimpleBrowserClient = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    bootBrowserSimpleMdpClient: () => bootBrowserSimpleMdpClient,
    registerBrowserSimpleCapabilities: () => registerBrowserSimpleCapabilities
  });
  async function bootBrowserSimpleMdpClient(options = {}) {
    const environment = resolveEnvironment(options.environment);
    const script = options.script ?? resolveCurrentScript(environment.document);
    const client = resolveMdpGlobal(environment.window).createClientFromScriptTag(script);
    registerBrowserSimpleCapabilities(client, environment);
    await client.connect();
    client.register();
    dispatchStatusEvent(environment.window, "ready", {
      client: client.describe()
    });
    return client;
  }
  function registerBrowserSimpleCapabilities(client, environment = resolveEnvironment()) {
    client.expose(
      "/browser/page-basics",
      {
        method: "GET",
        description: "Read the current page title, URL, path, hash, and query parameters."
      },
      async () => readPageBasics(environment.window, environment.document)
    );
    client.expose(
      "/browser/click-element",
      {
        method: "POST",
        description: "Click one element on the current page by CSS selector.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["selector"],
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the target element."
            }
          }
        }
      },
      async (request) => clickElement(environment, readRequestArgs(request))
    );
    client.expose(
      "/browser/alert-message",
      {
        method: "POST",
        description: "Show one alert message on the current page.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["message"],
          properties: {
            message: {
              type: "string",
              description: "Message content shown through window.alert."
            }
          }
        }
      },
      async (request) => alertMessage(environment.window, readRequestArgs(request))
    );
    client.expose(
      "/browser-simple/overview/skill.md",
      {
        description: "Overview of the simple browser client capability surface.",
        contentType: "text/markdown"
      },
      async () => [
        "# Browser Simple Client",
        "",
        "This client exposes a minimal browser capability set as canonical MDP paths.",
        "",
        "Available endpoints:",
        "",
        "- `GET /browser/page-basics` returns title, URL, pathname, hash, and query params.",
        "- `POST /browser/click-element` clicks one DOM element by CSS selector.",
        "- `POST /browser/alert-message` shows one alert dialog on the current page.",
        "",
        "Read `/browser-simple/tools/skill.md` for usage details and `/browser-simple/examples/skill.md` for example prompts."
      ].join("\n")
    );
    client.expose(
      "/browser-simple/tools/skill.md",
      {
        description: "Tool-by-tool usage details for the simple browser client.",
        contentType: "text/markdown"
      },
      async () => [
        "# Browser Simple Tools",
        "",
        "## `GET /browser/page-basics`",
        "",
        "Call with no arguments.",
        "",
        "Returns:",
        "",
        "- `title`",
        "- `url`",
        "- `origin`",
        "- `pathname`",
        "- `hash`",
        "- `query`",
        "",
        "## `POST /browser/click-element`",
        "",
        "Input:",
        "",
        "```json",
        '{ "selector": "button.primary" }',
        "```",
        "",
        "## `POST /browser/alert-message`",
        "",
        "Input:",
        "",
        "```json",
        '{ "message": "MDP says hello from this page." }',
        "```"
      ].join("\n")
    );
    client.expose(
      "/browser-simple/examples/skill.md",
      {
        description: "Prompt and workflow examples for the simple browser client.",
        contentType: "text/markdown"
      },
      async () => [
        "# Browser Simple Examples",
        "",
        "Example prompts:",
        "",
        '- "Call `GET /browser/page-basics` and tell me the current page title and query params."',
        '- "Call `POST /browser/click-element` with selector `button[type=submit]`."',
        '- "Call `POST /browser/alert-message` with a short confirmation message."',
        "",
        "Use `/browser-simple/overview/skill.md` first, then drill down into `/browser-simple/tools/skill.md` when the agent needs exact argument shapes."
      ].join("\n")
    );
    return client;
  }
  function resolveEnvironment(environment) {
    if (environment) {
      return environment;
    }
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("Browser simple MDP client requires a browser environment");
    }
    return {
      window,
      document
    };
  }
  function resolveCurrentScript(documentRef) {
    const script = documentRef.currentScript;
    if (!(script instanceof HTMLScriptElement)) {
      throw new Error("Unable to resolve the current browser simple client <script> tag");
    }
    return script;
  }
  function resolveMdpGlobal(windowRef) {
    const globalScope = windowRef;
    if (!globalScope.MDP) {
      throw new Error(
        "MDP global API not found. Load @modeldriveprotocol/client.global.js before browser-simple-mdp-client."
      );
    }
    return globalScope.MDP;
  }
  function readPageBasics(windowRef, documentRef) {
    const location = new URL(windowRef.location.href);
    return {
      title: documentRef.title,
      url: location.href,
      origin: location.origin,
      pathname: location.pathname,
      hash: location.hash,
      query: Object.fromEntries(location.searchParams.entries())
    };
  }
  function clickElement(environment, args) {
    const selector = readRequiredString(args, "selector");
    const element = environment.document.querySelector(selector);
    if (!element) {
      throw new Error(`No element matched selector: ${selector}`);
    }
    if (element instanceof HTMLElement) {
      if (typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ block: "center", inline: "center" });
      }
      element.click();
    } else {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
    return {
      selector,
      tagName: element.tagName.toLowerCase(),
      text: element.textContent?.trim() ?? ""
    };
  }
  function alertMessage(windowRef, args) {
    const message = readRequiredString(args, "message");
    windowRef.alert(message);
    return {
      delivered: true,
      message
    };
  }
  function readRequiredString(args, field) {
    if (!args || typeof args[field] !== "string" || args[field]?.trim() === "") {
      throw new Error(`Expected a non-empty string field: ${field}`);
    }
    return args[field];
  }
  function readRequestArgs(request) {
    const args = {
      ...request.params,
      ...request.queries,
      ...isRecord(request.body) ? request.body : {}
    };
    return Object.keys(args).length > 0 ? args : void 0;
  }
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function dispatchStatusEvent(windowRef, type, detail) {
    windowRef.dispatchEvent(
      new CustomEvent(`mdp:simple-browser-client:${type}`, { detail })
    );
  }
  async function autoBoot() {
    if (typeof document === "undefined" || !(document.currentScript instanceof HTMLScriptElement)) {
      return;
    }
    try {
      await bootBrowserSimpleMdpClient({ script: document.currentScript });
    } catch (error) {
      const environment = resolveEnvironment();
      dispatchStatusEvent(environment.window, "error", {
        message: error instanceof Error ? error.message : String(error)
      });
      console.error(error);
    }
  }
  void autoBoot();
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=browser-simple-mdp-client.global.js.map
