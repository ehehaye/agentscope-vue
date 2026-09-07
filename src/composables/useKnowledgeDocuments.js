/**
 * 知识库文档列表。
 * 拉取某知识库的全部文档（分页耗尽），knowledgeBaseId 变化时重拉。
 * @param {import('vue').Ref<string|null>|string|null} knowledgeBaseId
 */
import { ref, watch } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

export function useKnowledgeDocuments(knowledgeBaseId) {
	const documents = ref([]);
	const loading = ref(!!knowledgeBaseId);
	const error = ref(null);
	let requestSeq = 0;

	async function refetch() {
		const kbId = typeof knowledgeBaseId === 'string' ? knowledgeBaseId : knowledgeBaseId?.value;
		if (!kbId) {
			documents.value = [];
			loading.value = false;
			return;
		}
		const seq = ++requestSeq;
		loading.value = true;
		error.value = null;
		try {
			const list = await knowledgeBaseApi.listAllDocuments(kbId);
			if (seq !== requestSeq) return;
			documents.value = list;
		} catch (e) {
			if (seq !== requestSeq) return;
			error.value = e;
		} finally {
			if (seq === requestSeq) loading.value = false;
		}
	}

	watch(
		() => (typeof knowledgeBaseId === 'string' ? knowledgeBaseId : knowledgeBaseId?.value),
		() => refetch(),
		{ immediate: true },
	);

	return { documents, loading, error, refetch };
}
