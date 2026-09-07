import { ApiError, client, getBaseUrl, getUserId } from './client';

/** Drop undefined values and stringify the rest for `client` params. */
function toQuery(params) {
  const query = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query[key] = String(value);
  }
  return query;
}

/** The backend caps `page_size` at 128. */
const MAX_PAGE_SIZE = 128;

/**
 * Drain a paginated endpoint into one flat array.
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
 * XHR-based upload — fetch does not surface byte-level send progress.
 */
function uploadDocumentXhr(knowledgeBaseId, file, options = {}) {
  const { onProgress, signal } = options;
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = new URL(`/knowledge_bases/${knowledgeBaseId}/documents`, getBaseUrl());
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
        // keep raw text
      }
      reject(new ApiError(xhr.status, detail));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError(0, 'Network error'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    xhr.send(formData);
  });
}

export const knowledgeBaseApi = {
  list: (params = {}) => client.get('/knowledge_bases/', toQuery({ ...params })),

  listAll: (params = {}) =>
    fetchAllPages(async (page, pageSize) => {
      const res = await knowledgeBaseApi.list({ ...params, page, page_size: pageSize });
      return { items: res.knowledge_bases, total: res.total };
    }),

  listEmbeddingModels: () => client.get('/knowledge_bases/embedding_models'),

  listChunkers: () => client.get('/knowledge_bases/chunkers'),

  middlewareParametersSchema: () =>
    client.get('/knowledge_bases/middleware/parameters_schema'),

  supportedContentTypes: () => client.get('/knowledge_bases/supported_content_types'),

  create: (body) => client.post('/knowledge_bases/', body),

  update: (knowledgeBaseId, body) => client.patch(`/knowledge_bases/${knowledgeBaseId}`, body),

  delete: (knowledgeBaseId) => client.delete(`/knowledge_bases/${knowledgeBaseId}`),

  listDocuments: (knowledgeBaseId, params = {}) =>
    client.get(`/knowledge_bases/${knowledgeBaseId}/documents`, toQuery({ ...params })),

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
    client.get(
      `/knowledge_bases/${knowledgeBaseId}/documents/${documentId}/chunks`,
      toQuery({ page, page_size: pageSize }),
      { silent: true },
    ),

  createDocumentDownloadToken: (knowledgeBaseId, documentId) =>
    client.post(`/knowledge_bases/${knowledgeBaseId}/documents/${documentId}/download_token`),

  documentContentUrl: (knowledgeBaseId, documentId, token, download = false) => {
    const url = new URL(`/knowledge_bases/${knowledgeBaseId}/documents/${documentId}`, getBaseUrl());
    url.searchParams.set('token', token);
    if (download) url.searchParams.set('download', 'true');
    return url.toString();
  },

  fetchDocumentText: async (knowledgeBaseId, documentId) => {
    const res = await client.stream(`/knowledge_bases/${knowledgeBaseId}/documents/${documentId}`);
    return res.text();
  },

  getDocumentStatus: (knowledgeBaseId, ids) => {
    if (ids.length === 0) {
      return Promise.resolve({ items: [] });
    }
    return client.get(`/knowledge_bases/${knowledgeBaseId}/documents/status`, {
      ids: ids.join(','),
    });
  },

  uploadDocument: (knowledgeBaseId, file, options) => uploadDocumentXhr(knowledgeBaseId, file, options),

  deleteDocument: (knowledgeBaseId, documentId) =>
    client.delete(`/knowledge_bases/${knowledgeBaseId}/documents/${documentId}`),

  search: (knowledgeBaseId, body) =>
    client.post(`/knowledge_bases/${knowledgeBaseId}/search`, body),
};
