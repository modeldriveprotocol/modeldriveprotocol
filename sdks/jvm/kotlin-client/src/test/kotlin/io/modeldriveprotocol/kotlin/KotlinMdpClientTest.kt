package io.modeldriveprotocol.kotlin

import io.modeldriveprotocol.client.ClientTransport
import io.modeldriveprotocol.client.MdpClient
import io.modeldriveprotocol.client.ProtocolCodec
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.runBlocking
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CompletionStage
import java.util.function.Consumer

class KotlinMdpClientTest {
  @Test
  fun wrapsJavaClientWithSuspendApi() = runBlocking {
    val transport = FakeTransport()
    val client =
      KotlinMdpClient.create(
        "ws://127.0.0.1:7070",
        MdpClient.ClientInfo("kotlin-01", "Kotlin Client"),
        transport,
      )

    client.exposeEndpoint("/goods", MdpClient.HttpMethod.GET) { _, _ ->
      mapOf("total" to 1)
    }

    client.connect()
    client.register()

    assertEquals(1, transport.sent.size)
    assertEquals("registerClient", transport.sent.first()["type"])
  }

  private class FakeTransport : ClientTransport {
    val sent = mutableListOf<Map<String, Any?>>()

    override fun connect(
      onMessage: Consumer<ProtocolCodec.ServerToClientMessage>,
      onClose: Runnable,
    ): CompletionStage<Void> = CompletableFuture.completedFuture(null)

    override fun send(message: Map<String, Any?>): CompletionStage<Void> {
      @Suppress("UNCHECKED_CAST")
      sent += message as Map<String, Any?>
      return CompletableFuture.completedFuture(null)
    }

    override fun close(): CompletionStage<Void> = CompletableFuture.completedFuture(null)
  }
}
