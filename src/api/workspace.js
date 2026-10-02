import { ApiError, client, getBaseUrl, getUserId } from './client';
import { resolveEndpoint } from './mapping';

/**
 * 基于 XHR 的文件夹上传——fetch 不暴露字节级发送进度，
 * 凡是要驱动进度条的场景都必须走 XHR。
 *
 * manifest 需要与文件分片一起发送：服务端边收边打包 tar，
 * 而 tar 头要求在写入字节前先知道每个成员的大小——
 * multipart 分片本身不声明这一点，只能由 manifest 补充。
 */
function uploadSkillXhr(agentId, sessionId, files, options = {}) {
  const { onProgress, signal } = options;
  const formData = new FormData();
  formData.append(
    'manifest',
    JSON.stringify({
      entries: files.map((file) => ({
        path: file.webkitRelativePath || file.name,
        size: file.size,
      })),
    }),
  );
  for (const file of files) formData.append('files', file);

  const { path } = resolveEndpoint('workspace.skill.upload');

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = new URL(path, getBaseUrl());
    url.searchParams.set('agent_id', agentId);
    url.searchParams.set('session_id', sessionId);
    xhr.open('POST', url.toString(), true);
    xhr.setRequestHeader('X-User-ID', getUserId());

    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => signal?.removeEventListener('abort', onAbort);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        onProgress({
          loaded: e.loaded,
          total: e.lengthComputable ? e.total : 0,
        });
      };
    }

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let detail = xhr.responseText || xhr.statusText;
      try {
        const json = JSON.parse(xhr.responseText);
        if (typeof json.detail === 'string') detail = json.detail;
        else if (json.detail !== undefined) detail = JSON.stringify(json.detail);
      } catch {
        // 解析失败则保留原始文本
      }
      reject(new ApiError(xhr.status, detail));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError(0, '无法连接到服务器，请检查服务器地址和网络。'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    xhr.send(formData);
  });
}

export const workspaceApi = {
  /**
   * 列出会话工作区中某一层的目录内容。
   *
   * `path` 可以是绝对路径，也可以相对于工作区根目录；留空则列根目录。
   * 并不限制在根目录内——沙箱后端可访问的文件系统就是沙箱本身，
   * 本地后端的调用方本就已被信任可访问宿主机。响应会回显解析后的绝对路径。
   */
  directories: (agentId, sessionId, path = '') =>
    client.request('workspace.directories', {
      params: {
        agent_id: agentId,
        session_id: sessionId,
        path,
      },
    }),

  /**
   * 会话当前指向的工作目录，以及该目录的 git 状态。
   *
   * 用 `silent` 是因为该接口按 UI 自己的节奏轮询：git 不可用是
   * 正常应答，不值得为此弹 toast。
   */
  status: (agentId, sessionId) =>
    client.request('workspace.status', {
      params: { agent_id: agentId, session_id: sessionId },
      silent: true,
    }),

  mcp: {
    list: (agentId, sessionId) =>
      client.request('workspace.mcp.list', {
        params: {
          agent_id: agentId,
          session_id: sessionId,
        },
      }),

    add: (agentId, sessionId, mcp) =>
      client.request('workspace.mcp.add', {
        params: { agent_id: agentId, session_id: sessionId },
        body: mcp,
      }),

    /**
     * 把用户已安装的 MCP 放入本工作区。
     * 传 id 而非配置——渲染后的配置从不出服务端，客户端无从重建。
     */
    addFromLibrary: (agentId, sessionId, mcpIds) =>
      client.request('workspace.mcp.addFromLibrary', {
        params: { agent_id: agentId, session_id: sessionId },
        body: { mcp_ids: mcpIds },
      }),

    remove: (mcpName, agentId, sessionId) =>
      client.request('workspace.mcp.remove', {
        pathParams: { mcpName },
        params: {
          agent_id: agentId,
          session_id: sessionId,
        },
      }),
  },

  skill: {
    list: (agentId, sessionId) =>
      client.request('workspace.skill.list', {
        params: { agent_id: agentId, session_id: sessionId },
      }),

    /**
     * @deprecated 路径已在服务端解析。本地文件夹请用 `upload`，
     * 已安装技能请用 `addFromLibrary`。
     */
    add: (agentId, sessionId, body) =>
      client.request('workspace.skill.add', {
        params: {
          agent_id: agentId,
          session_id: sessionId,
        },
        body,
      }),

    /** 把用户选中的文件夹作为技能上传，并上报发送进度。 */
    upload: (agentId, sessionId, files, options = {}) => uploadSkillXhr(agentId, sessionId, files, options),

    /** 按技能库记录 id，把用户已安装的技能放入本工作区。 */
    addFromLibrary: (agentId, sessionId, skillIds) =>
      client.request('workspace.skill.addFromLibrary', {
        params: { agent_id: agentId, session_id: sessionId },
        body: { skill_ids: skillIds },
      }),

    remove: (skillName, agentId, sessionId) =>
      client.request('workspace.skill.remove', {
        pathParams: { skillName },
        params: {
          agent_id: agentId,
          session_id: sessionId,
        },
      }),
  },
};
