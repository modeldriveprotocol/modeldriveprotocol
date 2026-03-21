---
title: getPrompt
status: MVP
---

# `getPrompt`

`getPrompt` 用来解析某一个 client 暴露的某一个 prompt。

## 输入

```json
{
  "clientId": "browser-01",
  "promptName": "summarizeSelection",
  "args": {
    "tone": "concise"
  }
}
```

必填字段：

- `clientId`
- `promptName`

可选字段：

- `args`
- `auth`

## 输出

```json
{
  "ok": true,
  "data": {
    "messages": [
      {
        "role": "user",
        "content": "Summarize the active selection."
      }
    ]
  }
}
```

当你需要的是 prompt payload，而不是立刻执行一个动作时，用这个接口。
