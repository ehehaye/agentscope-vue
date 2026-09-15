# Java 中转层 API 接口文档（GET / POST 映射版）

> 本文档基于 `API.md`（真源：`src/api/*.js`），面向 **Java 中转服务 → Python 后端** 的转发场景。
> Java 层仅开放 **GET、POST** 两类接口，共 **83** 个接口（80 个 `client.` 封装接口 + 3 个 XHR/直构 URL 接口）。

## 映射规则

| 原始 Method | 映射后 Method | 映射后 URL | 说明 |
|---|---|---|---|
| GET | GET | 不变 | 参数位置不变（Query） |
| POST | POST | 不变 | Body / Query 不变 |
| PATCH | POST | `{原URL}/update` | 追加 `/update` 动作后缀，避免与同路径 DELETE 转 POST 冲突 |
| DELETE | POST | `{原URL}/delete` | 追加 `/delete` 动作后缀；原 Query 参数保留，Body 为空 |

> 采用动作后缀而非统一 URL + Method 重写头，是因为同一路径常同时存在 PATCH / DELETE（如 `/agent/{agentId}`），且集合路径上已有 POST 创建接口。该风格与 Python 端既有 POST 子资源一致（如 `/channels/{id}/enable`、`/channels/{id}/disable`）。

## 通用约定

- **映射后 Base URL**：Java 中转服务地址（替代原 `localStorage.server_url` 直连 Python）。
- **请求头**：所有请求携带 `X-User-ID`；含 Body 请求携带 `Content-Type: application/json`（multipart 接口除外）。
- **路径参数** `{xxx}` 由调用方替换；标注 `encodeURIComponent` 的参数 Java 层转发时同样需 URL 编码。
- **Query 参数**：映射后全部保留在 URL Query 上（含 DELETE 转出的 POST）。
- **Body**：标注"透传"的对象前端不约束字段，结构由 Python 后端 schema 决定，Java 层建议透传不做字段裁剪。
- **备注列**：标注 SSE、原始文本、multipart、文件下载等非标准 JSON 场景，以及特殊行为。

---

## 1. health（后端健康探针）

`src/api/health.js`，超时 10s。

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| healthApi.check | `/health` | GET | `/health` | GET | 无 Query/Body；前端控制项：`silent`、`timeoutMs=10000` | 标准 JSON |

## 2. workspace（工作区：目录 / Git 状态 / MCP / 技能）

`src/api/workspace.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| workspaceApi.directories | `/workspace/directories` | GET | `/workspace/directories` | GET | Query：`agent_id`、`session_id`、`path`（可空） | 标准 JSON |
| workspaceApi.status | `/workspace/status` | GET | `/workspace/status` | GET | Query：`agent_id`、`session_id` | 标准 JSON；前端 silent（git 不可用属正常响应，勿报错） |
| workspaceApi.mcp.list | `/workspace/mcp` | GET | `/workspace/mcp` | GET | Query：`agent_id`、`session_id` | 标准 JSON |
| workspaceApi.mcp.add | `/workspace/mcp` | POST | `/workspace/mcp` | POST | Query：`agent_id`、`session_id`；Body：MCP 配置对象（透传） | 标准 JSON |
| workspaceApi.mcp.addFromLibrary | `/workspace/mcp/from-library` | POST | `/workspace/mcp/from-library` | POST | Query：`agent_id`、`session_id`；Body：`{ mcp_ids: string[] }` | 标准 JSON |
| workspaceApi.mcp.remove | `/workspace/mcp/{mcpName}` | DELETE | `/workspace/mcp/{mcpName}/delete` | POST | Query：`agent_id`、`session_id`；无 Body | 标准 JSON |
| workspaceApi.skill.list | `/workspace/skill` | GET | `/workspace/skill` | GET | Query：`agent_id`、`session_id` | 标准 JSON |
| workspaceApi.skill.add（@deprecated） | `/workspace/skill` | POST | `/workspace/skill` | POST | Query：`agent_id`、`session_id`；Body：技能配置对象（透传） | 标准 JSON；已废弃，改用 `upload` 或 `addFromLibrary` |
| workspaceApi.skill.addFromLibrary | `/workspace/skill/from-library` | POST | `/workspace/skill/from-library` | POST | Query：`agent_id`、`session_id`；Body：`{ skill_ids: string[] }` | 标准 JSON |
| workspaceApi.skill.remove | `/workspace/skill/{skillName}` | DELETE | `/workspace/skill/{skillName}/delete` | POST | Query：`agent_id`、`session_id`；无 Body | 标准 JSON |

## 3. credential（凭据）

`src/api/credential.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| credentialApi.list | `/credential/` | GET | `/credential/` | GET | 无 | 标准 JSON |
| credentialApi.schemas | `/credential/schemas` | GET | `/credential/schemas` | GET | 无 | 标准 JSON |
| credentialApi.create | `/credential/` | POST | `/credential/` | POST | Body：凭据对象（透传） | 标准 JSON |
| credentialApi.update | `/credential/{credentialId}` | PATCH | `/credential/{credentialId}/update` | POST | Body：凭据更新字段（透传） | 标准 JSON |
| credentialApi.delete | `/credential/{credentialId}` | DELETE | `/credential/{credentialId}/delete` | POST | 无 Body | 标准 JSON |

## 4. model（模型列表）

`src/api/model.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| modelApi.list | `/model/` | GET | `/model/` | GET | Query：`provider` | 标准 JSON |
| ttsModelApi.list | `/tts-model/` | GET | `/tts-model/` | GET | Query：`provider` | 标准 JSON |
| embeddingModelApi.list | `/embedding-model/` | GET | `/embedding-model/` | GET | Query：`provider` | 标准 JSON |

## 5. channel（渠道与绑定）

`src/api/channel.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| channelApi.listTypes | `/channels/types` | GET | `/channels/types` | GET | 无 | 标准 JSON |
| channelApi.list | `/channels/` | GET | `/channels/` | GET | 无 | 标准 JSON |
| channelApi.get | `/channels/{channelId}` | GET | `/channels/{channelId}` | GET | 无 | 标准 JSON |
| channelApi.create | `/channels/` | POST | `/channels/` | POST | Body：渠道配置对象（透传） | 标准 JSON |
| channelApi.update | `/channels/{channelId}` | PATCH | `/channels/{channelId}/update` | POST | Body：渠道更新字段（透传） | 标准 JSON |
| channelApi.delete | `/channels/{channelId}` | DELETE | `/channels/{channelId}/delete` | POST | 无 Body | 标准 JSON |
| channelApi.enable | `/channels/{channelId}/enable` | POST | `/channels/{channelId}/enable` | POST | 无 Body | 标准 JSON |
| channelApi.disable | `/channels/{channelId}/disable` | POST | `/channels/{channelId}/disable` | POST | 无 Body | 标准 JSON |
| channelApi.status | `/channels/{channelId}/status` | GET | `/channels/{channelId}/status` | GET | 无 | 标准 JSON |
| channelApi.listSessions | `/channels/{channelId}/sessions` | GET | `/channels/{channelId}/sessions` | GET | 无 | 标准 JSON |
| channelApi.listChatIds | `/channels/{channelId}/chat_ids` | GET | `/channels/{channelId}/chat_ids` | GET | 无 | 标准 JSON |
| channelApi.startBinding | `/channels/bindings` | POST | `/channels/bindings` | POST | Body：`{ channel_type: string }` | 标准 JSON |
| channelApi.pollBinding | `/channels/bindings/{bindingId}` | GET | `/channels/bindings/{bindingId}` | GET | 无 | 标准 JSON；轮询同时推进绑定流程，需短间隔重复请求 |
| channelApi.cancelBinding | `/channels/bindings/{bindingId}/cancel` | POST | `/channels/bindings/{bindingId}/cancel` | POST | 无 Body | 标准 JSON；前端支持 silent |

## 6. agent（智能体）

`src/api/agent.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| agentApi.list | `/agent/` | GET | `/agent/` | GET | 无 | 标准 JSON |
| agentApi.getSchema | `/agent/schema/v2` | GET | `/agent/schema/v2` | GET | 无 | 标准 JSON |
| agentApi.create | `/agent/` | POST | `/agent/` | POST | Body：Agent 创建配置（透传） | 标准 JSON；前端支持 silent |
| agentApi.update | `/agent/{agentId}` | PATCH | `/agent/{agentId}/update` | POST | Body：Agent 更新字段（透传） | 标准 JSON；前端支持 silent |
| agentApi.delete | `/agent/{agentId}` | DELETE | `/agent/{agentId}/delete` | POST | 无 Body | 标准 JSON |

## 7. schedule（定时任务）

`src/api/schedule.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| scheduleApi.list | `/schedule/` | GET | `/schedule/` | GET | 无 | 标准 JSON |
| scheduleApi.create | `/schedule/` | POST | `/schedule/` | POST | Body：定时任务对象（透传） | 标准 JSON |
| scheduleApi.update | `/schedule/{scheduleId}` | PATCH | `/schedule/{scheduleId}/update` | POST | Body：定时任务更新字段（透传） | 标准 JSON |
| scheduleApi.delete | `/schedule/{scheduleId}` | DELETE | `/schedule/{scheduleId}/delete` | POST | 无 Body | 标准 JSON |
| scheduleApi.listSessions | `/schedule/{scheduleId}/sessions` | GET | `/schedule/{scheduleId}/sessions` | GET | 无 | 标准 JSON |

## 8. knowledgeBase（知识库与文档）

`src/api/knowledgeBase.js`。分页 `page_size` Python 端上限 128；`listAll` / `listAllDocuments` 为前端自动翻页封装，不对应独立端点。

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| knowledgeBaseApi.list | `/knowledge_bases/` | GET | `/knowledge_bases/` | GET | Query：透传筛选参数；分页 `page`、`page_size`（≤128） | 标准 JSON |
| knowledgeBaseApi.listEmbeddingModels | `/knowledge_bases/embedding_models` | GET | `/knowledge_bases/embedding_models` | GET | 无 | 标准 JSON |
| knowledgeBaseApi.listChunkers | `/knowledge_bases/chunkers` | GET | `/knowledge_bases/chunkers` | GET | 无 | 标准 JSON |
| knowledgeBaseApi.middlewareParametersSchema | `/knowledge_bases/middleware/parameters_schema` | GET | `/knowledge_bases/middleware/parameters_schema` | GET | 无 | 标准 JSON |
| knowledgeBaseApi.supportedContentTypes | `/knowledge_bases/supported_content_types` | GET | `/knowledge_bases/supported_content_types` | GET | 无 | 标准 JSON |
| knowledgeBaseApi.create | `/knowledge_bases/` | POST | `/knowledge_bases/` | POST | Body：知识库配置对象（透传） | 标准 JSON |
| knowledgeBaseApi.update | `/knowledge_bases/{knowledgeBaseId}` | PATCH | `/knowledge_bases/{knowledgeBaseId}/update` | POST | Body：知识库更新字段（透传） | 标准 JSON |
| knowledgeBaseApi.delete | `/knowledge_bases/{knowledgeBaseId}` | DELETE | `/knowledge_bases/{knowledgeBaseId}/delete` | POST | 无 Body | 标准 JSON |
| knowledgeBaseApi.listDocuments | `/knowledge_bases/{knowledgeBaseId}/documents` | GET | `/knowledge_bases/{knowledgeBaseId}/documents` | GET | Query：透传参数；分页 `page`、`page_size` | 标准 JSON |
| knowledgeBaseApi.listDocumentChunks | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/chunks` | GET | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/chunks` | GET | Query：`page`（默认 1）、`page_size`（默认 30） | 标准 JSON；前端 silent |
| knowledgeBaseApi.createDocumentDownloadToken | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/download_token` | POST | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/download_token` | POST | 无 Body | 标准 JSON；返回一次性下载 token |
| knowledgeBaseApi.fetchDocumentText | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | GET（stream） | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | GET | 无 | **非 JSON**：响应为文档原始文本流，前端按 `text()` 读取；Java 层需透传原始字节/文本，勿按 JSON 反序列化 |
| knowledgeBaseApi.getDocumentStatus | `/knowledge_bases/{knowledgeBaseId}/documents/status` | GET | `/knowledge_bases/{knowledgeBaseId}/documents/status` | GET | Query：`ids`（多个 ID 逗号拼接；空数组前端不发请求） | 标准 JSON |
| knowledgeBaseApi.deleteDocument | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | DELETE | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/delete` | POST | 无 Body | 标准 JSON |
| knowledgeBaseApi.search | `/knowledge_bases/{knowledgeBaseId}/search` | POST | `/knowledge_bases/{knowledgeBaseId}/search` | POST | Body：检索请求对象（透传） | 标准 JSON |

## 9. mcp（已安装 MCP 记录）

`src/api/mcp.js`，`mcpId` 经 `encodeURIComponent`。

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| mcpApi.list | `/mcp` | GET | `/mcp` | GET | 无 | 标准 JSON |
| mcpApi.update | `/mcp/{mcpId}` | PATCH | `/mcp/{mcpId}/update` | POST | Body：MCP 更新字段（透传） | 标准 JSON；路径参数需 URL 编码 |
| mcpApi.remove | `/mcp/{mcpId}` | DELETE | `/mcp/{mcpId}/delete` | POST | 无 Body | 标准 JSON；路径参数需 URL 编码 |

## 10. skill（用户级技能库）

`src/api/skill.js`，`skillId` 经 `encodeURIComponent`。注意与 workspace 中的会话级技能区分。

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| skillApi.list | `/skill` | GET | `/skill` | GET | 无 | 标准 JSON |
| skillApi.get | `/skill/{skillId}` | GET | `/skill/{skillId}` | GET | 无 | 标准 JSON；响应含 SKILL.md 正文；路径参数需 URL 编码 |
| skillApi.remove | `/skill/{skillId}` | DELETE | `/skill/{skillId}/delete` | POST | 无 Body | 标准 JSON；已放入工作区的技能保留副本；路径参数需 URL 编码 |

## 11. hub（MCP / 技能广场）

`src/api/hub.js`，`hubId` / `cardId` 经 `encodeURIComponent`。

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| hubApi.mcp.listHubs | `/hub/mcp` | GET | `/hub/mcp` | GET | 无 | 标准 JSON |
| hubApi.mcp.listCards | `/hub/mcp/{hubId}/cards` | GET | `/hub/mcp/{hubId}/cards` | GET | Query（均可选）：`q`、`cursor`、`limit` | 标准 JSON；游标分页 |
| hubApi.mcp.getCard | `/hub/mcp/{hubId}/cards/{cardId}` | GET | `/hub/mcp/{hubId}/cards/{cardId}` | GET | 无 | 标准 JSON |
| hubApi.mcp.install | `/hub/mcp/{hubId}/cards/{cardId}/install` | POST | `/hub/mcp/{hubId}/cards/{cardId}/install` | POST | Body：安装参数对象（透传） | 标准 JSON；前端支持 silent |
| hubApi.skill.listHubs | `/hub/skill` | GET | `/hub/skill` | GET | 无 | 标准 JSON |
| hubApi.skill.listCards | `/hub/skill/{hubId}/cards` | GET | `/hub/skill/{hubId}/cards` | GET | Query（均可选）：`q`、`cursor`、`limit` | 标准 JSON；游标分页 |
| hubApi.skill.getCard | `/hub/skill/{hubId}/cards/{cardId}` | GET | `/hub/skill/{hubId}/cards/{cardId}` | GET | 无 | 标准 JSON |
| hubApi.skill.install | `/hub/skill/{hubId}/cards/{cardId}/install` | POST | `/hub/skill/{hubId}/cards/{cardId}/install` | POST | Query：`name`（可选）；无 Body | 标准 JSON；前端支持 silent |

## 12. session（会话与消息流）

`src/api/session.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| sessionApi.list | `/sessions/` | GET | `/sessions/` | GET | Query：`agent_id` | 标准 JSON |
| sessionApi.create | `/sessions/` | POST | `/sessions/` | POST | Body：会话创建对象（透传） | 标准 JSON；前端依据返回体 `session_id` 做新会话标记 |
| sessionApi.update | `/sessions/{sessionId}` | PATCH | `/sessions/{sessionId}/update` | POST | Query：`agent_id`；Body：会话更新字段（透传） | 标准 JSON；前端支持 silent |
| sessionApi.delete | `/sessions/{sessionId}` | DELETE | `/sessions/{sessionId}/delete` | POST | Query：`agent_id`；无 Body | 标准 JSON |
| sessionApi.interrupt | `/sessions/{sessionId}/interrupt` | POST | `/sessions/{sessionId}/interrupt` | POST | Query：`agent_id`；Body：`null` | 标准 JSON；中断正在进行的生成 |
| sessionApi.messages | `/sessions/{sessionId}/messages` | GET | `/sessions/{sessionId}/messages` | GET | Query：`agent_id`、`before`（可选）、`limit`（可选） | 标准 JSON |
| sessionApi.streamEvents | `/sessions/{sessionId}/stream` | GET（stream） | `/sessions/{sessionId}/stream` | GET | Query：`agent_id` | **SSE 流（`text/event-stream`），非 JSON 单次响应**：长连接，逐行读取 `data: {json}` 事件；Java 层必须以流式/SSE 透传（关闭缓冲、支持请求中止 signal），不能缓存整体响应 |

## 13. chat（触发对话生成）

`src/api/chat.js`

| 前端方法 | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| chatApi.trigger | `/chat/` | POST | `/chat/` | POST | Body：对话触发请求对象（透传） | POST 响应本身为标准 JSON；**生成内容不在响应体中**，而是经 `/sessions/{sessionId}/stream` 的 SSE 流推送（见 12）；前端支持 silent |

---

## 附录：未走 `client.` 封装的接口（XHR / 直构 URL）

| 前端方法（源位置） | 原始 URL | 原始 Method | 映射后 URL | 映射后 Method | 请求体（参数） | 备注 |
|---|---|---|---|---|---|---|
| knowledgeBaseApi.uploadDocument（`knowledgeBase.js`） | `/knowledge_bases/{knowledgeBaseId}/documents` | POST（XHR） | `/knowledge_bases/{knowledgeBaseId}/documents` | POST | `multipart/form-data`：字段 `file` | **非 JSON（multipart 文件上传）**：Java 层需用 multipart 透传文件，勿包装成 JSON；需支持上传进度与中止 |
| knowledgeBaseApi.documentContentUrl（`knowledgeBase.js`，仅构造 URL） | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | GET（直构 URL） | `/knowledge_bases/{knowledgeBaseId}/documents/{documentId}` | GET | Query：`token`（必填）、`download=true`（可选） | **文件下载/原文响应，非 JSON**：token 由 `download_token` 接口换取；Java 层需透传二进制流与 Content-Disposition |
| workspaceApi.skill.upload（`workspace.js`） | `/workspace/skill/upload` | POST（XHR） | `/workspace/skill/upload` | POST | Query：`agent_id`、`session_id`；`multipart/form-data`：字段 `manifest`（JSON 字符串 `{ "entries": [{ "path": string, "size": number }] }`）+ 多个 `files` | **非 JSON（multipart 文件夹上传）**：`manifest` 为普通表单字段（JSON 字符串），`files` 为多文件；需透传上传进度与中止 |

---

## 映射统计

- 保持 **GET**：43 个（含 1 个 SSE 流、1 个原始文本流、1 个文件下载，均非标准 JSON）
- 保持 **POST**：22 个（含 2 个 multipart XHR 上传）
- PATCH → **POST `/update`**：7 个
- DELETE → **POST `/delete`**：11 个
- 合计：83 个（80 个封装接口 + 3 个 XHR/直构 URL 接口）
