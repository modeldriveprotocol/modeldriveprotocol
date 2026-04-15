package io.modeldriveprotocol.client;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MdpClient {
  private volatile ClientInfo clientInfo;
  private volatile AuthContext auth;
  private final ProcedureRegistry registry = new ProcedureRegistry();
  private final ClientTransport transport;
  private final AtomicBoolean connected = new AtomicBoolean(false);
  private final AtomicBoolean registered = new AtomicBoolean(false);

  public MdpClient(String serverUrl, ClientInfo clientInfo) {
    this(serverUrl, clientInfo, createDefaultTransport(serverUrl));
  }

  public MdpClient(String serverUrl, ClientInfo clientInfo, ClientTransport transport) {
    Objects.requireNonNull(serverUrl, "serverUrl");
    this.clientInfo = Objects.requireNonNull(clientInfo, "clientInfo");
    this.transport = Objects.requireNonNull(transport, "transport");
  }

  public MdpClient setAuth(AuthContext auth) {
    this.auth = auth;
    return this;
  }

  public MdpClient exposeEndpoint(
      String path,
      HttpMethod method,
      PathHandler handler,
      EndpointOptions options) {
    registry.exposeEndpoint(path, method, handler, options == null ? new EndpointOptions() : options);
    return this;
  }

  public MdpClient exposeSkillMarkdown(String path, String content, SkillOptions options) {
    registry.exposeSkillMarkdown(path, content, options == null ? new SkillOptions() : options);
    return this;
  }

  public MdpClient exposePromptMarkdown(String path, String content, PromptOptions options) {
    registry.exposePromptMarkdown(path, content, options == null ? new PromptOptions() : options);
    return this;
  }

  public ClientDescriptor describe() {
    return registry.describe(clientInfo);
  }

  public CompletionStage<Void> connect() {
    return transport
        .connect(this::handleMessage, this::handleTransportClose)
        .thenRun(() -> connected.set(true));
  }

  public CompletionStage<Void> register(ClientInfoOverride overrideInfo) {
    requireConnected();
    if (overrideInfo != null) {
      clientInfo = clientInfo.apply(overrideInfo);
    }
    return transport
        .send(ProtocolCodec.buildRegisterClientMessage(describe(), auth))
        .thenRun(() -> registered.set(true));
  }

  public CompletionStage<Void> syncCatalog() {
    requireConnected();
    requireRegistered();
    return transport.send(
        ProtocolCodec.buildUpdateClientCatalogMessage(
            clientInfo.id(),
            registry.describePaths()));
  }

  public CompletionStage<Void> disconnect() {
    CompletionStage<Void> unregister =
        connected.get() && registered.get()
            ? transport.send(ProtocolCodec.buildUnregisterClientMessage(clientInfo.id()))
            : CompletableFuture.completedFuture(null);
    return unregister
        .handle((ignored, error) -> null)
        .thenCompose(ignored -> transport.close())
        .thenRun(
            () -> {
              connected.set(false);
              registered.set(false);
            });
  }

  private void handleMessage(ProtocolCodec.ServerToClientMessage message) {
    if (message instanceof ProtocolCodec.PingMessage pingMessage) {
      transport.send(ProtocolCodec.buildPongMessage(pingMessage.timestamp()));
      return;
    }

    if (message instanceof ProtocolCodec.CallClientMessage callClientMessage) {
      registry
          .invoke(callClientMessage)
          .handle(
              (data, error) ->
                  error == null
                      ? ProtocolCodec.buildCallClientResultMessage(
                          callClientMessage.requestId(),
                          true,
                          data,
                          null)
                      : ProtocolCodec.buildCallClientResultMessage(
                          callClientMessage.requestId(),
                          false,
                          null,
                          SerializedError.handler(error.getCause() == null ? error.getMessage() : error.getCause().getMessage())))
          .thenCompose(transport::send);
    }
  }

  private void handleTransportClose() {
    connected.set(false);
    registered.set(false);
  }

  private void requireConnected() {
    if (!connected.get()) {
      throw new IllegalStateException("MDP client is not connected");
    }
  }

  private void requireRegistered() {
    requireConnected();
    if (!registered.get()) {
      throw new IllegalStateException("MDP client is not registered");
    }
  }

  private static ClientTransport createDefaultTransport(String serverUrl) {
    String scheme = URI.create(serverUrl).getScheme();
    if ("ws".equals(scheme) || "wss".equals(scheme)) {
      return new WebSocketClientTransport(serverUrl);
    }
    if ("http".equals(scheme) || "https".equals(scheme)) {
      return new HttpLoopClientTransport(serverUrl);
    }
    throw new IllegalArgumentException("Unsupported MDP transport protocol: " + scheme);
  }

  public enum HttpMethod {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE
  }

  public interface PathHandler {
    CompletionStage<Object> handle(PathRequest request, PathInvocationContext context);
  }

  public record AuthContext(
      String scheme,
      String token,
      Map<String, String> headers,
      Map<String, Object> metadata) {
    public Map<String, Object> toMap() {
      Map<String, Object> payload = new LinkedHashMap<>();
      if (scheme != null) {
        payload.put("scheme", scheme);
      }
      if (token != null) {
        payload.put("token", token);
      }
      if (headers != null && !headers.isEmpty()) {
        payload.put("headers", headers);
      }
      if (metadata != null && !metadata.isEmpty()) {
        payload.put("metadata", metadata);
      }
      return payload;
    }
  }

  public record ClientInfo(
      String id,
      String name,
      String description,
      String version,
      String platform,
      Map<String, Object> metadata) {
    public ClientInfo(String id, String name) {
      this(id, name, null, null, null, null);
    }

    public ClientInfo apply(ClientInfoOverride overrideInfo) {
      return new ClientInfo(
          overrideInfo.id != null ? overrideInfo.id : id,
          overrideInfo.name != null ? overrideInfo.name : name,
          overrideInfo.description != null ? overrideInfo.description : description,
          overrideInfo.version != null ? overrideInfo.version : version,
          overrideInfo.platform != null ? overrideInfo.platform : platform,
          overrideInfo.metadata != null ? overrideInfo.metadata : metadata);
    }
  }

  public static final class ClientInfoOverride {
    private final String id;
    private final String name;
    private final String description;
    private final String version;
    private final String platform;
    private final Map<String, Object> metadata;

    public ClientInfoOverride() {
      this(null, null, null, null, null, null);
    }

    public ClientInfoOverride(
        String id,
        String name,
        String description,
        String version,
        String platform,
        Map<String, Object> metadata) {
      this.id = id;
      this.name = name;
      this.description = description;
      this.version = version;
      this.platform = platform;
      this.metadata = metadata;
    }

    public ClientInfoOverride description(String value) {
      return new ClientInfoOverride(id, name, value, version, platform, metadata);
    }
  }

  public sealed interface PathDescriptor permits EndpointPathDescriptor, SkillPathDescriptor, PromptPathDescriptor {
    String path();

    String descriptorType();

    Map<String, Object> toMap();
  }

  public record EndpointPathDescriptor(
      String path,
      HttpMethod method,
      String description,
      Map<String, Object> inputSchema,
      Map<String, Object> outputSchema,
      String contentType)
      implements PathDescriptor {
    @Override
    public String descriptorType() {
      return "endpoint";
    }

    @Override
    public Map<String, Object> toMap() {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("type", "endpoint");
      payload.put("path", path);
      payload.put("method", method.name());
      if (description != null) {
        payload.put("description", description);
      }
      if (inputSchema != null) {
        payload.put("inputSchema", inputSchema);
      }
      if (outputSchema != null) {
        payload.put("outputSchema", outputSchema);
      }
      if (contentType != null) {
        payload.put("contentType", contentType);
      }
      return payload;
    }
  }

  public record SkillPathDescriptor(String path, String description, String contentType)
      implements PathDescriptor {
    @Override
    public String descriptorType() {
      return "skill";
    }

    @Override
    public Map<String, Object> toMap() {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("type", "skill");
      payload.put("path", path);
      payload.put("contentType", contentType);
      if (description != null) {
        payload.put("description", description);
      }
      return payload;
    }
  }

  public record PromptPathDescriptor(
      String path,
      String description,
      Map<String, Object> inputSchema,
      Map<String, Object> outputSchema)
      implements PathDescriptor {
    @Override
    public String descriptorType() {
      return "prompt";
    }

    @Override
    public Map<String, Object> toMap() {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("type", "prompt");
      payload.put("path", path);
      if (description != null) {
        payload.put("description", description);
      }
      if (inputSchema != null) {
        payload.put("inputSchema", inputSchema);
      }
      if (outputSchema != null) {
        payload.put("outputSchema", outputSchema);
      }
      return payload;
    }
  }

  public record ClientDescriptor(
      String id,
      String name,
      List<PathDescriptor> paths,
      String description,
      String version,
      String platform,
      Map<String, Object> metadata) {
    public Map<String, Object> toMap() {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("id", id);
      payload.put("name", name);
      payload.put("paths", paths.stream().map(PathDescriptor::toMap).toList());
      if (description != null) {
        payload.put("description", description);
      }
      if (version != null) {
        payload.put("version", version);
      }
      if (platform != null) {
        payload.put("platform", platform);
      }
      if (metadata != null) {
        payload.put("metadata", metadata);
      }
      return payload;
    }
  }

  public record SerializedError(String code, String message, Object details) {
    static SerializedError handler(String message) {
      return new SerializedError("handler_error", message, null);
    }

    Map<String, Object> toMap() {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("code", code);
      payload.put("message", message);
      if (details != null) {
        payload.put("details", details);
      }
      return payload;
    }
  }

  public record PathRequest(
      Map<String, Object> params,
      Map<String, Object> queries,
      Object body,
      Map<String, String> headers) {}

  public record PathInvocationContext(
      String requestId,
      String clientId,
      String pathType,
      HttpMethod method,
      String path,
      AuthContext auth) {}

  public record EndpointOptions(
      String description,
      Map<String, Object> inputSchema,
      Map<String, Object> outputSchema,
      String contentType) {
    public EndpointOptions() {
      this(null, null, null, null);
    }

    public EndpointOptions description(String value) {
      return new EndpointOptions(value, inputSchema, outputSchema, contentType);
    }
  }

  public record SkillOptions(String description, String contentType) {
    public SkillOptions() {
      this(null, "text/markdown");
    }

    public SkillOptions description(String value) {
      return new SkillOptions(value, contentType);
    }
  }

  public record PromptOptions(
      String description,
      Map<String, Object> inputSchema,
      Map<String, Object> outputSchema) {
    public PromptOptions() {
      this(null, null, null);
    }

    public PromptOptions description(String value) {
      return new PromptOptions(value, inputSchema, outputSchema);
    }
  }

  private static final class ProcedureRegistry {
    private final List<ProcedureEntry> entries = new ArrayList<>();

    synchronized void exposeEndpoint(
        String path,
        HttpMethod method,
        PathHandler handler,
        EndpointOptions options) {
      register(
          new EndpointPathDescriptor(
              path,
              method,
              options.description(),
              options.inputSchema(),
              options.outputSchema(),
              options.contentType()),
          handler);
    }

    synchronized void exposeSkillMarkdown(String path, String content, SkillOptions options) {
      String description =
          options.description() != null ? options.description() : deriveMarkdownDescription(content);
      register(
          new SkillPathDescriptor(path, description, options.contentType()),
          (_request, _context) -> CompletableFuture.completedFuture(content));
    }

    synchronized void exposePromptMarkdown(String path, String content, PromptOptions options) {
      String description =
          options.description() != null ? options.description() : deriveMarkdownDescription(content);
      register(
          new PromptPathDescriptor(path, description, options.inputSchema(), options.outputSchema()),
          (_request, _context) ->
              CompletableFuture.completedFuture(
                  Map.of("messages", List.of(Map.of("role", "user", "content", content)))));
    }

    synchronized List<PathDescriptor> describePaths() {
      return entries.stream().map(ProcedureEntry::descriptor).toList();
    }

    synchronized ClientDescriptor describe(ClientInfo clientInfo) {
      return new ClientDescriptor(
          clientInfo.id(),
          clientInfo.name(),
          describePaths(),
          clientInfo.description(),
          clientInfo.version(),
          clientInfo.platform(),
          clientInfo.metadata());
    }

    CompletionStage<Object> invoke(ProtocolCodec.CallClientMessage message) {
      ProcedureEntry entry = resolveEntry(message.method(), message.path());
      if (entry == null) {
        return CompletableFuture.failedFuture(
            new IllegalArgumentException(
                "Unknown path \"" + message.path() + "\" for method \"" + message.method() + "\""));
      }
      PathRequest request =
          new PathRequest(
              entry.match.params(),
              message.query() == null ? Map.of() : message.query(),
              message.body(),
              message.headers() == null ? Map.of() : message.headers());
      PathInvocationContext context =
          new PathInvocationContext(
              message.requestId(),
              message.clientId(),
              entry.descriptor.descriptorType(),
              message.method(),
              message.path(),
              message.auth());
      return entry.handler.handle(request, context);
    }

    private void register(PathDescriptor descriptor, PathHandler handler) {
      assertDescriptorPathShape(descriptor);
      String key = registrationKey(descriptor);
      ProcedureEntry entry = new ProcedureEntry(descriptor, handler, null);
      for (int index = 0; index < entries.size(); index += 1) {
        if (registrationKey(entries.get(index).descriptor).equals(key)) {
          entries.set(index, entry);
          return;
        }
      }
      entries.add(entry);
    }

    private ProcedureEntry resolveEntry(HttpMethod method, String path) {
      ProcedureEntry bestMatch = null;
      for (ProcedureEntry entry : entries) {
        if (!matchesMethod(entry.descriptor, method)) {
          continue;
        }
        PathUtils.PathPatternMatch match = PathUtils.matchPathPattern(entry.descriptor.path(), path);
        if (match == null) {
          continue;
        }
        if (bestMatch == null
            || PathUtils.comparePathSpecificity(match.specificity(), bestMatch.match.specificity()) > 0) {
          bestMatch = new ProcedureEntry(entry.descriptor, entry.handler, match);
        }
      }
      return bestMatch;
    }

    private void assertDescriptorPathShape(PathDescriptor descriptor) {
      if (!PathUtils.isPathPattern(descriptor.path())) {
        throw new IllegalArgumentException("Invalid path: " + descriptor.path());
      }

      if (descriptor instanceof EndpointPathDescriptor endpoint) {
        if (PathUtils.isSkillPath(endpoint.path()) || PathUtils.isPromptPath(endpoint.path())) {
          throw new IllegalArgumentException("Endpoint path cannot target reserved skill or prompt leaves");
        }
      }

      if (descriptor instanceof SkillPathDescriptor skill && !PathUtils.isSkillPath(skill.path())) {
        throw new IllegalArgumentException("Skill paths must end with skill.md or SKILL.md");
      }

      if (descriptor instanceof PromptPathDescriptor prompt && !PathUtils.isPromptPath(prompt.path())) {
        throw new IllegalArgumentException("Prompt paths must end with prompt.md or PROMPT.md");
      }
    }

    private String registrationKey(PathDescriptor descriptor) {
      if (descriptor instanceof EndpointPathDescriptor endpoint) {
        return endpoint.method() + " " + endpoint.path();
      }
      return descriptor.path();
    }

    private boolean matchesMethod(PathDescriptor descriptor, HttpMethod method) {
      if (descriptor instanceof EndpointPathDescriptor endpoint) {
        return endpoint.method() == method;
      }
      return method == HttpMethod.GET;
    }

    private String deriveMarkdownDescription(String content) {
      List<String> paragraph = new ArrayList<>();
      for (String rawLine : content.split("\\R")) {
        String line = rawLine.trim();
        if (line.isEmpty()) {
          if (!paragraph.isEmpty()) {
            break;
          }
          continue;
        }
        if (line.startsWith("#")) {
          continue;
        }
        paragraph.add(line);
      }
      return paragraph.isEmpty() ? null : String.join(" ", paragraph);
    }

    private record ProcedureEntry(
        PathDescriptor descriptor,
        PathHandler handler,
        PathUtils.PathPatternMatch match) {}
  }
}
