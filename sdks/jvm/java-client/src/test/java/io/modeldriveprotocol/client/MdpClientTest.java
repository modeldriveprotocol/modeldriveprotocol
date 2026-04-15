package io.modeldriveprotocol.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;

class MdpClientTest {
  @Test
  void registerRequiresConnection() {
    FakeTransport transport = new FakeTransport();
    MdpClient client = new MdpClient("ws://127.0.0.1:7070", new MdpClient.ClientInfo("java-01", "Java Client"), transport);

    assertThrows(IllegalStateException.class, () -> client.register(null));
  }

  @Test
  void registersPathsAfterConnect() {
    FakeTransport transport = new FakeTransport();
    MdpClient client = new MdpClient("ws://127.0.0.1:7070", new MdpClient.ClientInfo("java-01", "Java Client"), transport);
    client
        .setAuth(new MdpClient.AuthContext("Bearer", "client-token", null, null))
        .exposeEndpoint(
            "/goods",
            MdpClient.HttpMethod.GET,
            (_request, _context) -> CompletableFuture.completedFuture(Map.of("list", List.of(), "total", 0)),
            new MdpClient.EndpointOptions().description("List goods"));

    client.connect().toCompletableFuture().join();
    client.register(new MdpClient.ClientInfoOverride().description("Test java client"))
        .toCompletableFuture()
        .join();

    assertEquals(1, transport.sent.size());
    assertEquals("registerClient", transport.sent.get(0).get("type"));
  }

  @Test
  void handlesPingAndInvocationMessages() {
    FakeTransport transport = new FakeTransport();
    MdpClient client = new MdpClient("ws://127.0.0.1:7070", new MdpClient.ClientInfo("java-01", "Java Client"), transport);
    client.exposeEndpoint(
        "/goods/:id",
        MdpClient.HttpMethod.GET,
        (request, context) ->
            CompletableFuture.completedFuture(
                Map.of(
                    "id", request.params().get("id"),
                    "page", request.queries().get("page"),
                    "authToken", context.auth().token())),
        new MdpClient.EndpointOptions());

    client.connect().toCompletableFuture().join();
    transport.emit(new ProtocolCodec.PingMessage(123));
    transport.emit(
        new ProtocolCodec.CallClientMessage(
            "req-01",
            "java-01",
            MdpClient.HttpMethod.GET,
            "/goods/sku-01",
            Map.of(),
            Map.of("page", 2),
            null,
            Map.of(),
            new MdpClient.AuthContext(null, "host-token", null, null)));

    assertEquals(2, transport.sent.size());
    assertEquals("pong", transport.sent.get(0).get("type"));
    assertEquals("callClientResult", transport.sent.get(1).get("type"));
    assertTrue(Boolean.TRUE.equals(transport.sent.get(1).get("ok")));
  }

  private static final class FakeTransport implements ClientTransport {
    private final List<Map<String, Object>> sent = new ArrayList<>();
    private Consumer<ProtocolCodec.ServerToClientMessage> onMessage;

    @Override
    public CompletionStage<Void> connect(
        Consumer<ProtocolCodec.ServerToClientMessage> onMessage,
        Runnable onClose) {
      this.onMessage = onMessage;
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<Void> send(Map<String, Object> message) {
      sent.add(message);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<Void> close() {
      return CompletableFuture.completedFuture(null);
    }

    void emit(ProtocolCodec.ServerToClientMessage message) {
      onMessage.accept(message);
    }
  }
}
