package io.modeldriveprotocol.client;

import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.function.Consumer;

public interface ClientTransport {
  CompletionStage<Void> connect(
      Consumer<ProtocolCodec.ServerToClientMessage> onMessage,
      Runnable onClose);

  CompletionStage<Void> send(Map<String, Object> message);

  CompletionStage<Void> close();
}
