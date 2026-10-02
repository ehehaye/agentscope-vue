import { ApiError, client, getBaseUrl, getUserId } from './client';
import { resolveEndpoint } from './mapping';

/** 丢弃 undefined 值，其余转成字符串，用于拼接 query 参数。 */
function toQuery(params) {
  const query = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query[key] = String(value);
  }
  return query;
}

/** 后端将 `page_size` 上限固定为 128。 */
const MAX_PAGE_SIZE = 128;

/**
 * 把分页端点逐页取完，摊平成一个数组。
 */
async function fetchAllPages(fetchPage) {
  const all = [];
  for (let page = 1; ; page++) {
    const { items, total } = await fetchPage(page, MAX_PAGE_SIZE);
    all.push(...items);
    if (items.length === 0 || all.length >= total) break;
  }
  return all;
}

/**
 * 基于 XHR 的上传——fetch 无法暴露字节级发送进度。
 */
function uploadDocumentXhr(knowledgeBaseId, file, options = {}) {
  const { onProgress, signal } = options;
  const formData = new FormData();
  formData.append('file', file);

  const { path } = resolveEndpoint('kb.uploadDocument', {
    pathParams: { knowledgeBaseId },
  });

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = new URL(path, getBaseUrl());
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
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(e);
        }
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

export const knowledgeBaseApi = {
  list: (params = {}) => client.request('kb.list', { params: toQuery({ ...params }) }),

  listAll: (params = {}) =>
    fetchAllPages(async (page, pageSize) => {
      const res = await knowledgeBaseApi.list({ ...params, page, page_size: pageSize });
      return { items: res.knowledge_bases, total: res.total };
    }),

  listEmbeddingModels: () => client.request('kb.listEmbeddingModels'),

  listChunkers: () => client.request('kb.listChunkers'),

  middlewareParametersSchema: () => client.request('kb.middlewareParametersSchema'),

  supportedContentTypes: () => client.request('kb.supportedContentTypes'),

  create: (body) => client.request('kb.create', { body }),

  update: (knowledgeBaseId, body) => client.request('kb.update', { pathParams: { knowledgeBaseId }, body }),

  remove: (knowledgeBaseId) => client.request('kb.remove', { pathParams: { knowledgeBaseId } }),

  listDocuments: (knowledgeBaseId, params = {}) =>
    client.request('kb.listDocuments', {
      pathParams: { knowledgeBaseId },
      params: toQuery({ ...params }),
    }),

  listAllDocuments: (knowledgeBaseId, params = {}) =>
    fetchAllPages(async (page, pageSize) => {
      const res = await knowledgeBaseApi.listDocuments(knowledgeBaseId, {
        ...params,
        page,
        page_size: pageSize,
      });
      return { items: res.documents, total: res.total };
    }),

  listDocumentChunks: (knowledgeBaseId, documentId, page = 1, pageSize = 30) =>
    client.request('kb.listDocumentChunks', {
      pathParams: { knowledgeBaseId, documentId },
      params: toQuery({ page, page_size: pageSize }),
      silent: true,
    }),

  createDocumentDownloadToken: (knowledgeBaseId, documentId) =>
    client.request('kb.createDocumentDownloadToken', {
      pathParams: { knowledgeBaseId, documentId },
    }),

  documentContentUrl: (knowledgeBaseId, documentId, token, download = false) => {
    const { path } = resolveEndpoint('kb.documentContent', {
      pathParams: { knowledgeBaseId, documentId },
    });
    const url = new URL(path, getBaseUrl());
    url.searchParams.set('token', token);
    if (download) url.searchParams.set('download', 'true');
    return url.toString();
  },

  fetchDocumentText: async (knowledgeBaseId, documentId) => {
    const res = await client.request('kb.fetchDocumentText', {
      pathParams: { knowledgeBaseId, documentId },
      stream: true,
    });
    return res.text();
  },

  getDocumentStatus: (knowledgeBaseId, ids) => {
    if (ids.length === 0) {
      return Promise.resolve({ items: [] });
    }
    return client.request('kb.documentStatus', {
      pathParams: { knowledgeBaseId },
      params: {
        ids: ids.join(','),
      },
    });
  },

  uploadDocument: (knowledgeBaseId, file, options) => uploadDocumentXhr(knowledgeBaseId, file, options),

  deleteDocument: (knowledgeBaseId, documentId) =>
    client.request('kb.deleteDocument', {
      pathParams: { knowledgeBaseId, documentId },
    }),

  search: (knowledgeBaseId, body) => client.request('kb.search', { pathParams: { knowledgeBaseId }, body }),
};
