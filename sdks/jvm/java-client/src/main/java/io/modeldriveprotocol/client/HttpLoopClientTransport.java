package io.modeldriveprotocol.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

public final class HttpLoopClientTransport implements ClientTransport {
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final String DEFAULT_HTTP_LOOP_PATH = "/mdp/http-loop";
  private static final String SESSION_HEADER = "x-mdp-session-id";

  private final String serverUrl;
  private final String endpointPath;
  private final Map<String, String> headers;
  private final HttpClient httpClient;
  private final ExecutorService executor;
  private final AtomicBoolean closed = new AtomicBoolean(true);
  private volatile String sessionId;

  public HttpLoopClientTransport(String serverUrl) {
    this(serverUrl, Map.of());
  }

  public HttpLoopClientTransport(String serverUrl, Map<String, String> headers) {
    this.serverUrl = Objects.requireNonNull(serverUrl);
    this.endpointPath = DEFAULT_HTTP_LOOP_PATH;
    this.headers = Map.copyOf(headers);
    this.httpClient = HttpClient.newHttpClient();
    this.executor = Executors.newSingleThreadExecutor();
  }

  @Override
  public CompletionStage<Void> connect(
      Consumer<ProtocolCodec.ServerToClientMessage> onMessage,
      Runnable onClose) {
    HttpRequest request =
        requestBuilder("/connect")
            .POST(HttpRequest.BodyPublishers.ofString("{}"))
            .build();

    return httpClient
        .sendAsync(request, HttpResponse.BodyHandlers.ofString())
        .thenApply(HttpResponse::body)
        .thenAccept(this::captureSessionId)
        .thenRun(
            () -> {
              closed.set(false);
              CompletableFuture.runAsync(() -> pollLoop(onMessage, onClose), executor);
            });
  }

  @Override
  public CompletionStage<Void> send(Map<String, Object> message) {
    if (sessionId == null) {
      return CompletableFuture.failedFuture(new IllegalStateException("Transport is not connected"));
    }
    HttpRequest request =
        requestBuilder("/send")
            .header(SESSION_HEADER, sessionId)
            .POST(HttpRequest.BodyPublishers.ofString(ProtocolCodec.toJson(Map.of("message", message))))
            .build();
    return httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding()).thenApply(ignored -> null);
  }

  @Override
  public CompletionStage<Void> close() {
    closed.set(true);
    String currentSessionId = sessionId;
    sessionId = null;
    if (currentSessionId == null) {
      executor.shutdownNow();
      return CompletableFuture.completedFuture(null);
    }

    HttpRequest request =
        requestBuilder("/disconnect")
            .header(SESSION_HEADER, currentSessionId)
            .POST(HttpRequest.BodyPublishers.ofString("{}"))
            .build();

    return httpClient
        .sendAsync(request, HttpResponse.BodyHandlers.discarding())
        .handle(
            (ignored, error) -> {
              executor.shutdownNow();
              return null;
            });
  }

  private void pollLoop(
      Consumer<ProtocolCodec.ServerToClientMessage> onMessage,
      Runnable onClose) {
    try {
      while (!closed.get() && sessionId != null) {
        HttpRequest request =
            requestBuilder("/poll?sessionId=" + sessionId + "&waitMs=25000")
                .GET()
                .build();
        HttpResponse<String> response =
            httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 204) {
          continue;
        }
        JsonNode payload = OBJECT_MAPPER.readTree(response.body());
        JsonNode messageNode = payload.get("message");
        if (messageNode == null || messageNode.isNull()) {
          continue;
        }
        onMessage.accept(ProtocolCodec.parseServerToClientMessage(messageNode.toString()));
      }
    } catch (Exception ignored) {
    } finally {
      closed.set(true);
      sessionId = null;
      onClose.run();
    }
  }

  private HttpRequest.Builder requestBuilder(String suffixOrQuery) {
    HttpRequest.Builder builder =
        HttpRequest.newBuilder(URI.create(serverUrl + endpointPath + suffixOrQuery))
            .header("content-type", "application/json");
    headers.forEach(builder::header);
    return builder;
  }

  private void captureSessionId(String payload) {
    try {
      JsonNode node = OBJECT_MAPPER.readTree(payload);
      JsonNode sessionIdNode = node.get("sessionId");
      if (sessionIdNode == null || !sessionIdNode.isTextual()) {
        throw new IllegalStateException("Invalid HTTP loop handshake response");
      }
      sessionId = sessionIdNode.asText();
    } catch (IOException error) {
      throw new IllegalStateException("Invalid HTTP loop handshake response", error);
    }
  }
}
