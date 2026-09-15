# 前端 API 接口文档

> 由 `src/api/` 目录下所有 `client.` 调用扫描整理而成，共 **80** 个经统一封装的接口，另有 **3** 个 XHR/直构 URL 的接口列于文末。
> 真源文件：`src/api/*.js`。

## 通用约定

- **Base URL**：运行时取 `localStorage.server_url`（见 `client.js` 的 `getBaseUrl()`）。
- **请求头**：
  - 所有请求自动携带 `X-User-ID`（取 `localStorage.username`）；
  - 含 Body 的请求自动携带 `Content-Type: application/json`。
- **client 方法签名**（`src/api/client.js`）：
  - `client.get(path, params, options)`
  - `client.post(path, body, params, options)`
  - `client.patch(path, body, params, options)`
  - `client.delete(path, params)`
  - `client.stream(path, options)` —— 只返回原始 `Response`，SSE 解析由上层处理
- **参数位置**：`params` → URL Query（值会被 String 化）；`body` → JSON 请求体；`options` 仅为前端控制项（`silent` / `baseUrl` / `userId` / `timeoutMs` / `signal`），不发送到后端。
- **错误处理**：非 2xx 统一抛出 `ApiError(status, detail)`，`silent` 模式不弹 toast；HTTP 204 返回 `undefined`。
- 下表中 `{xxx}` 表示路径参数；标注“透传”的 Body 表示前端不约束字段，结构由后端 schema 决定。

---

## 1. health（后端健康探针）

`src/api/health.js`，超时 10s。

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| healthApi.check | `/health` | GET | 无；显式 options：`baseUrl`、`userId`、`timeoutMs=10000`、`silent` |

## 2. workspace（工作区：目录 / Git 状态 / MCP / 技能）

`src/api/workspace.js`

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| workspaceApi.directories | `/workspace/directories` | GET | Query：`agent_id`、`session_id`、`path`（可空） |
| workspaceApi.status | `/workspace/status` | GET | Query：`agent_id`、`session_id`（silent） |
| workspaceApi.mcp.list | `/workspace/mcp` | GET | Query：`agent_id`、`session_id` |
| workspaceApi.mcp.add | `/workspace/mcp` | POST | Query：`agent_id`、`session_id`；Body：MCP 配置对象（透传） |
| workspaceApi.mcp.addFromLibrary | `/workspace/mcp/from-library` | POST | Query：`agent_id`、`session_id`；Body：`{ mcp_ids: string[] }` |
| workspaceApi.mcp.remove | `/workspace/mcp/{mcpName}` | DELETE | Query：`agent_id`、`session_id` |
| workspaceApi.skill.list | `/workspace/skill` | GET | Query：`agent_id`、`session_id` |
| workspaceApi.skill.add（@deprecated） | `/workspace/skill` | POST | Query：`agent_id`、`session_id`；Body：技能配置对象（透传） |
| workspaceApi.skill.addFromLibrary | `/workspace/skill/from-library` | POST | Query：`agent_id`、`session_id`；Body：`{ skill_ids: string[] }` |
| workspaceApi.skill.remove | `/workspace/skill/{skillName}` | DELETE | Query：`agent_id`、`session_id` |

## 3. credential（凭据）

`src/api/credential.js`

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| credentialApi.list | `/credential/` | GET | 无 |
| credentialApi.schemas | `/credential/schemas` | GET | 无 |
| credentialApi.create | `/credential/` | POST | Body：凭据对象（透传） |
| credentialApi.update | `/credential/{credentialId}` | PATCH | Body：凭据更新字段（透传） |
| credentialApi.delete | `/credential/{credentialId}` | DELETE | 无 |

## 4. model（模型列表）

`src/api/model.js`

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| modelApi.list | `/model/` | GET | Query：`provider` |
| ttsModelApi.list | `/tts-model/` | GET | Query：`provider` |
| embeddingModelApi.list | `/embedding-model/` | GET | Query：`provider` |

## 5. channel（渠道与绑定）

`src/api/channel.js`

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| channelApi.listTypes | `/channels/types` | GET | 无 |
| channelApi.list | `/channels/` | GET | 无 |
| channelApi.get | `/channels/{channelId}` | GET | 无 |
| channelApi.create | `/channels/` | POST | Body：渠道配置对象（透传） |
| channelApi.update | `/channels/{channelId}` | PATCH | Body：渠道更新字段（透传） |
| channelApi.delete | `/channels/{channelId}` | DELETE | 无 |
| channelApi.enable | `/channels/{channelId}/enable` | POST | 无 |
| channelApi.disable | `/channels/{channelId}/disable` | POST | 无 |
| channelApi.status | `/channels/{channelId}/status` | GET | 无 |
| channelApi.listSessions | `/channels/{channelId}/sessions` | GET | 无 |
| channelApi.listChatIds | `/channels/{channelId}/chat_ids` | GET | 无 |
| channelApi.startBinding | `/channels/bindings` | POST | Body：`{ channel_type: string }` |
| channelApi.pollBinding | `/channels/bindings/{bindingId}` | GET | 无（轮询同时推进绑定流程） |
| channelApi.cancelBinding | `/channels/bindings/{bindingId}/cancel` | POST | 无（支持 options.silent） |

## 6. agent（智能体）

`src/api/agent.js`

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| agentApi.list | `/agent/` | GET | 无 |
| agentApi.getSchema | `/agent/schema/v2` | GET | 无 |
| agentApi.create | `/agent/` | POST | Body：Agent 创建配置（透传；支持 options.silent） |
| agentApi.update | `/agent/{agentId}` | PATCH | Body：Agent 更新字段（透传；支持 options.silent） |
| agentApi.delete | `/agent/{agentId}` | DELETE | 无 |

## 7. schedule（定时任务）

`src/api/schedule.js`

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| scheduleApi.list | `/schedule/` | GET | 无 |
| scheduleApi.create | `/schedule/` | POST | Body：定时任务对象（透传） |
| scheduleApi.update | `/schedule/{scheduleId}` | PATCH | Body：定时任务更新字段（透传） |
| scheduleApi.delete | `/schedule/{scheduleId}` | DELETE | 无 |
| scheduleApi.listSessions | `/schedule/{scheduleId}/sessions` | GET | 无 |

## 8. knowledgeBase（知识库与文档）

`src/api/knowledgeBase.js`。分页接口 `page_size` 后端上限 128；`listAll` / `listAllDocuments` 为前端自动翻页封装（循环调下列接口），非独立端点。

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| knowledgeBaseApi.list | `/knowledge_bases/` | GET | Query：透传筛选参数；分页 `page`、`page_size`（≤128） |
| knowledgeBaseApi.listEmbeddingModels | `/knowledge_bases/embedding_models` | GET | 无 |
| knowledgeBaseApi.listChunkers | `/knowledge_bases/chunkers` | GET | 无 |
| knowledgeBaseApi.middlewareParametersSchema | `/knowledge_bases/middleware/parameters_schema` | GET | 无 |
| knowledgeBaseApi.supportedContentTypes | `/knowledge_bases/supported_content_types` | GET | 无 |
| knowledgeBaseApi.create | `/knowledge_bases/` | POST | Body：知识库配置对象（透传） |
| knowledgeBaseApi.update | `/knowledge_bases/{knowledgeBaseId}` | PATCH | Body：知识库更新字段（透传） |
| knowledgeBaseApi.delete | `/knowledge_bases/{knowledgeBaseId}` | DELETE | 无 |
| knowledgeBaseApi.listDocuments | `/knowledge_bases/{knowledgeBaseId}/documents` | GET | Query：透传参数；分页 `page`、`page_size` |
| knowledgeBaseApi.listDocumentChunks | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/chunks` | GET | Query：`page`（默认 1）、`page_size`（默认 30）；silent |
| knowledgeBaseApi.createDocumentDownloadToken | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/download_token` | POST | 无 |
| knowledgeBaseApi.fetchDocumentText | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | GET（`client.stream`，取原始文本） | 无 |
| knowledgeBaseApi.getDocumentStatus | `/knowledge_bases/{knowledgeBaseId}/documents/status` | GET | Query：`ids`（多个 ID 逗号拼接；空数组不发请求） |
| knowledgeBaseApi.deleteDocument | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | DELETE | 无 |
| knowledgeBaseApi.search | `/knowledge_bases/{knowledgeBaseId}/search` | POST | Body：检索请求对象（透传） |

## 9. mcp（已安装 MCP 记录）

`src/api/mcp.js`，`mcpId` 经 `encodeURIComponent`。

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| mcpApi.list | `/mcp` | GET | 无 |
| mcpApi.update | `/mcp/{mcpId}` | PATCH | Body：MCP 更新字段（透传） |
| mcpApi.remove | `/mcp/{mcpId}` | DELETE | 无 |

## 10. skill（用户级技能库）

`src/api/skill.js`，`skillId` 经 `encodeURIComponent`。注意与 workspace 中的会话级技能区分。

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| skillApi.list | `/skill` | GET | 无 |
| skillApi.get | `/skill/{skillId}` | GET | 无（响应含 SKILL.md 正文） |
| skillApi.remove | `/skill/{skillId}` | DELETE | 无（已放入工作区的技能保留副本） |

## 11. hub（MCP / 技能广场）

`src/api/hub.js`，`hubId` / `cardId` 经 `encodeURIComponent`。

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| hubApi.mcp.listHubs | `/hub/mcp` | GET | 无 |
| hubApi.mcp.listCards | `/hub/mcp/{hubId}/cards` | GET | Query（均可选）：`q`、`cursor`、`limit` |
| hubApi.mcp.getCard | `/hub/mcp/{hubId}/cards/{cardId}` | GET | 无 |
| hubApi.mcp.install | `/hub/mcp/{hubId}/cards/{cardId}/install` | POST | Body：安装参数对象（透传；支持 options.silent） |
| hubApi.skill.listHubs | `/hub/skill` | GET | 无 |
| hubApi.skill.listCards | `/hub/skill/{hubId}/cards` | GET | Query（均可选）：`q`、`cursor`、`limit` |
| hubApi.skill.getCard | `/hub/skill/{hubId}/cards/{cardId}` | GET | 无 |
| hubApi.skill.install | `/hub/skill/{hubId}/cards/{cardId}/install` | POST | Query：`name`（可选）；无 Body（支持 options.silent） |

## 12. session（会话与消息流）

`src/api/session.js`

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| sessionApi.list | `/sessions/` | GET | Query：`agent_id` |
| sessionApi.create | `/sessions/` | POST | Body：会话创建对象（透传；成功后前端标记返回的 `session_id`） |
| sessionApi.update | `/sessions/{sessionId}` | PATCH | Query：`agent_id`；Body：会话更新字段（透传；支持 options.silent） |
| sessionApi.delete | `/sessions/{sessionId}` | DELETE | Query：`agent_id` |
| sessionApi.interrupt | `/sessions/{sessionId}/interrupt` | POST | Query：`agent_id`；Body：`null` |
| sessionApi.messages | `/sessions/{sessionId}/messages` | GET | Query：`agent_id`、`before`（可选）、`limit`（可选） |
| sessionApi.streamEvents | `/sessions/{sessionId}/stream` | GET（`client.stream`，SSE 事件流） | Query：`agent_id`；options.signal 可中止；解析 `data: ` 行 JSON |

## 13. chat（触发对话生成）

`src/api/chat.js`。生成内容通过 SSE 流返回，不在 POST 响应体中。

| 前端方法 | URL | Method | 请求体（参数） |
|---|---|---|---|
| chatApi.trigger | `/chat/` | POST | Body：对话触发请求对象（透传；支持 options.silent） |

---

## 附录：未走 `client.` 封装的接口（XHR / 直构 URL）

以下 3 个接口因需要上传进度或直接拼下载 URL，未使用统一封装，但仍携带 `X-User-ID` 头、基于同一 Base URL。

| 前端方法（源位置） | URL | Method | 请求体（参数） |
|---|---|---|---|
| knowledgeBaseApi.uploadDocument（`knowledgeBase.js`） | `/knowledge_bases/{knowledgeBaseId}/documents` | POST | `multipart/form-data`：字段 `file`；XHR 支持 `onProgress` / `signal` |
| knowledgeBaseApi.documentContentUrl（`knowledgeBase.js`，仅构造 URL） | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | GET | Query：`token`（必填）、`download=true`（可选） |
| workspaceApi.skill.upload（`workspace.js`） | `/workspace/skill/upload` | POST | Query：`agent_id`、`session_id`；`multipart/form-data`：字段 `manifest`（JSON 字符串 `{ "entries": [{ "path": string, "size": number }] }`）+ 多个 `files` |
