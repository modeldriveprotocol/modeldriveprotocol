package io.modeldriveprotocol.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

public final class ProtocolCodec {
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  private ProtocolCodec() {}

  static Map<String, Object> buildRegisterClientMessage(
      MdpClient.ClientDescriptor client,
      MdpClient.AuthContext auth) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("type", "registerClient");
    payload.put("client", client.toMap());
    if (auth != null) {
      payload.put("auth", auth.toMap());
    }
    return payload;
  }

  static Map<String, Object> buildUpdateClientCatalogMessage(
      String clientId,
      java.util.List<MdpClient.PathDescriptor> paths) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("type", "updateClientCatalog");
    payload.put("clientId", clientId);
    payload.put(
        "paths",
        paths.stream().map(MdpClient.PathDescriptor::toMap).toList());
    return payload;
  }

  static Map<String, Object> buildUnregisterClientMessage(String clientId) {
    return Map.of("type", "unregisterClient", "clientId", clientId);
  }

  static Map<String, Object> buildCallClientResultMessage(
      String requestId,
      boolean ok,
      Object data,
      MdpClient.SerializedError error) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("type", "callClientResult");
    payload.put("requestId", requestId);
    payload.put("ok", ok);
    if (ok) {
      payload.put("data", data);
    } else if (error != null) {
      payload.put("error", error.toMap());
    }
    return payload;
  }

  static Map<String, Object> buildPongMessage(long timestamp) {
    return Map.of("type", "pong", "timestamp", timestamp);
  }

  static String toJson(Map<String, Object> message) {
    try {
      return OBJECT_MAPPER.writeValueAsString(message);
    } catch (JsonProcessingException error) {
      throw new IllegalArgumentException("Unable to encode MDP message", error);
    }
  }

  static ServerToClientMessage parseServerToClientMessage(String payload) throws IOException {
    JsonNode node = OBJECT_MAPPER.readTree(payload);
    if (!(node instanceof ObjectNode objectNode)) {
      throw new IOException("Invalid MDP message payload");
    }

    String type = stringField(objectNode, "type");
    return switch (type) {
      case "ping" -> new PingMessage(longField(objectNode, "timestamp"));
      case "pong" -> new PongMessage(longField(objectNode, "timestamp"));
      case "callClient" -> new CallClientMessage(
          stringField(objectNode, "requestId"),
          stringField(objectNode, "clientId"),
          MdpClient.HttpMethod.valueOf(stringField(objectNode, "method")),
          stringField(objectNode, "path"),
          objectMap(objectNode.get("params")),
          objectMap(objectNode.get("query")),
          value(objectNode.get("body")),
          stringMap(objectNode.get("headers")),
          authContext(objectNode.get("auth")));
      default -> throw new IOException("Unsupported MDP message type: " + type);
    };
  }

  private static String stringField(ObjectNode node, String fieldName) throws IOException {
    JsonNode value = node.get(fieldName);
    if (value == null || !value.isTextual()) {
      throw new IOException("Missing text field: " + fieldName);
    }
    return value.asText();
  }

  private static long longField(ObjectNode node, String fieldName) throws IOException {
    JsonNode value = node.get(fieldName);
    if (value == null || !value.isNumber()) {
      throw new IOException("Missing numeric field: " + fieldName);
    }
    return value.asLong();
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> objectMap(JsonNode node) {
    if (node == null || node.isNull() || !node.isObject()) {
      return Map.of();
    }
    return OBJECT_MAPPER.convertValue(node, Map.class);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, String> stringMap(JsonNode node) {
    if (node == null || node.isNull() || !node.isObject()) {
      return Map.of();
    }
    return OBJECT_MAPPER.convertValue(node, Map.class);
  }

  private static Object value(JsonNode node) {
    if (node == null || node.isNull()) {
      return null;
    }
    return OBJECT_MAPPER.convertValue(node, Object.class);
  }

  private static MdpClient.AuthContext authContext(JsonNode node) {
    if (node == null || node.isNull() || !node.isObject()) {
      return null;
    }
    ObjectNode objectNode = (ObjectNode) node;
    return new MdpClient.AuthContext(
        textOrNull(objectNode.get("scheme")),
        textOrNull(objectNode.get("token")),
        stringMap(objectNode.get("headers")),
        objectMap(objectNode.get("metadata")));
  }

  private static String textOrNull(JsonNode node) {
    return node != null && node.isTextual() ? node.asText() : null;
  }

  public sealed interface ServerToClientMessage permits PingMessage, PongMessage, CallClientMessage {}

  public record PingMessage(long timestamp) implements ServerToClientMessage {}

  public record PongMessage(long timestamp) implements ServerToClientMessage {}

  public record CallClientMessage(
      String requestId,
      String clientId,
      MdpClient.HttpMethod method,
      String path,
      Map<String, Object> params,
      Map<String, Object> query,
      Object body,
      Map<String, String> headers,
      MdpClient.AuthContext auth)
      implements ServerToClientMessage {}
}
