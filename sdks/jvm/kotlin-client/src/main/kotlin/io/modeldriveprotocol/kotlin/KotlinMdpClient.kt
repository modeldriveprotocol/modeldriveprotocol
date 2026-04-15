package io.modeldriveprotocol.kotlin

import io.modeldriveprotocol.client.ClientTransport
import io.modeldriveprotocol.client.MdpClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.future.await
import kotlinx.coroutines.future.future

class KotlinMdpClient private constructor(
  private val delegate: MdpClient,
) {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

  suspend fun connect() {
    delegate.connect().await()
  }

  suspend fun register(overrideInfo: MdpClient.ClientInfoOverride? = null) {
    delegate.register(overrideInfo).await()
  }

  suspend fun syncCatalog() {
    delegate.syncCatalog().await()
  }

  suspend fun disconnect() {
    delegate.disconnect().await()
  }

  fun setAuth(auth: MdpClient.AuthContext?): KotlinMdpClient {
    delegate.setAuth(auth)
    return this
  }

  fun describe(): MdpClient.ClientDescriptor = delegate.describe()

  fun exposeEndpoint(
    path: String,
    method: MdpClient.HttpMethod,
    options: MdpClient.EndpointOptions = MdpClient.EndpointOptions(),
    handler: suspend (MdpClient.PathRequest, MdpClient.PathInvocationContext) -> Any?,
  ): KotlinMdpClient {
    delegate.exposeEndpoint(
      path,
      method,
      MdpClient.PathHandler { request, context ->
        scope.future { handler(request, context) }
      },
      options,
    )
    return this
  }

  fun exposeSkillMarkdown(
    path: String,
    content: String,
    options: MdpClient.SkillOptions = MdpClient.SkillOptions(),
  ): KotlinMdpClient {
    delegate.exposeSkillMarkdown(path, content, options)
    return this
  }

  fun exposePromptMarkdown(
    path: String,
    content: String,
    options: MdpClient.PromptOptions = MdpClient.PromptOptions(),
  ): KotlinMdpClient {
    delegate.exposePromptMarkdown(path, content, options)
    return this
  }

  fun javaClient(): MdpClient = delegate

  companion object {
    @JvmStatic
    fun create(
      serverUrl: String,
      clientInfo: MdpClient.ClientInfo,
      transport: ClientTransport? = null,
    ): KotlinMdpClient {
      val delegate =
        if (transport == null) {
          MdpClient(serverUrl, clientInfo)
        } else {
          MdpClient(serverUrl, clientInfo, transport)
        }
      return KotlinMdpClient(delegate)
    }
  }
}
