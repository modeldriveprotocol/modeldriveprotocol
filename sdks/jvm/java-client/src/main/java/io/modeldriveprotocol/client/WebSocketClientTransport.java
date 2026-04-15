package io.modeldriveprotocol.client;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Consumer;

public final class WebSocketClientTransport implements ClientTransport {
  private final URI serverUri;
  private final Map<String, String> headers;
  private final HttpClient httpClient;
  private volatile WebSocket socket;

  public WebSocketClientTransport(String serverUrl) {
    this(serverUrl, Map.of());
  }

  public WebSocketClientTransport(String serverUrl, Map<String, String> headers) {
    this.serverUri = URI.create(serverUrl);
    this.headers = Map.copyOf(headers);
    this.httpClient = HttpClient.newHttpClient();
  }

  @Override
  public CompletionStage<Void> connect(
      Consumer<ProtocolCodec.ServerToClientMessage> onMessage,
      Runnable onClose) {
    WebSocket.Listener listener = new Listener(onMessage, onClose);
    WebSocket.Builder builder = httpClient.newWebSocketBuilder();
    headers.forEach(builder::header);
    return builder
        .buildAsync(serverUri, listener)
        .thenAccept(webSocket -> this.socket = webSocket);
  }

  @Override
  public CompletionStage<Void> send(Map<String, Object> message) {
    if (socket == null) {
      return CompletableFuture.failedFuture(new IllegalStateException("Transport is not connected"));
    }
    return socket.sendText(ProtocolCodec.toJson(message), true).thenApply(ignored -> null);
  }

  @Override
  public CompletionStage<Void> close() {
    if (socket == null) {
      return CompletableFuture.completedFuture(null);
    }
    WebSocket current = socket;
    socket = null;
    return current.sendClose(WebSocket.NORMAL_CLOSURE, "closing").thenApply(ignored -> null);
  }

  private final class Listener implements WebSocket.Listener {
    private final StringBuilder buffer = new StringBuilder();
    private final Consumer<ProtocolCodec.ServerToClientMessage> onMessage;
    private final Runnable onClose;

    private Listener(
        Consumer<ProtocolCodec.ServerToClientMessage> onMessage,
        Runnable onClose) {
      this.onMessage = onMessage;
      this.onClose = onClose;
    }

    @Override
    public void onOpen(WebSocket webSocket) {
      webSocket.request(1);
    }

    @Override
    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
      buffer.append(data);
      if (last) {
        try {
          onMessage.accept(ProtocolCodec.parseServerToClientMessage(buffer.toString()));
        } catch (Exception ignored) {
        } finally {
          buffer.setLength(0);
        }
      }
      webSocket.request(1);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
      byte[] bytes = new byte[data.remaining()];
      data.get(bytes);
      buffer.append(new String(bytes, java.nio.charset.StandardCharsets.UTF_8));
      if (last) {
        try {
          onMessage.accept(ProtocolCodec.parseServerToClientMessage(buffer.toString()));
        } catch (Exception ignored) {
        } finally {
          buffer.setLength(0);
        }
      }
      webSocket.request(1);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
      socket = null;
      onClose.run();
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public void onError(WebSocket webSocket, Throwable error) {
      socket = null;
      onClose.run();
    }
  }
}
