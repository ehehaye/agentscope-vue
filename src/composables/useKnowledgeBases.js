import { ref, onMounted } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

/**
 * Knowledge base CRUD + search wrapper.
 * @returns {{ knowledgeBases: Ref<any[]>, loading: Ref<boolean>, creating: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]>, create: (body: any) => Promise<string>, remove: (id: string) => Promise<void>, update: (id: string, body: any) => Promise<any>, uploadDocument: (kbId: string, file: File) => Promise<any>, deleteDocument: (kbId: string, docId: string) => Promise<void>, search: (kbId: string, body: any) => Promise<any> }}
 */
export function useKnowledgeBases() {
  const knowledgeBases = ref([]);
  const loading = ref(false);
  const creating = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    loading.value = true;
    error.value = null;
    try {
      const list = await knowledgeBaseApi.listAll();
      if (id === reqId) knowledgeBases.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  async function create(body) {
    creating.value = true;
    error.value = null;
    try {
      const { knowledge_base_id } = await knowledgeBaseApi.create(body);
      await refetch();
      return knowledge_base_id;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      creating.value = false;
    }
  }

  async function remove(knowledgeBaseId) {
    await knowledgeBaseApi.delete(knowledgeBaseId);
    await refetch();
  }

  async function update(knowledgeBaseId, body) {
    const view = await knowledgeBaseApi.update(knowledgeBaseId, body);
    await refetch();
    return view;
  }

  function uploadDocument(knowledgeBaseId, file) {
    return knowledgeBaseApi.uploadDocument(knowledgeBaseId, file);
  }

  function deleteDocument(knowledgeBaseId, documentId) {
    return knowledgeBaseApi.deleteDocument(knowledgeBaseId, documentId);
  }

  function search(knowledgeBaseId, body) {
    return knowledgeBaseApi.search(knowledgeBaseId, body);
  }

  onMounted(() => {
    refetch();
  });

  return {
    knowledgeBases,
    loading,
    creating,
    error,
    refetch,
    create,
    remove,
    update,
    uploadDocument,
    deleteDocument,
    search,
  };
}
