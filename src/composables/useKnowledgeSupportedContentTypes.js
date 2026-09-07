/**
 * 知识库支持的上传类型。
 * 模块级缓存：服务端 parser 能力在进程生命周期内不变，全局只拉一次。
 */
import { ref, onMounted, onUnmounted } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

let cached = null;
let inflight = null;

async function fetchSupported() {
	if (cached) return cached;
	if (inflight) return inflight;
	inflight = knowledgeBaseApi
		.supportedContentTypes()
		.then((res) => {
			cached = res;
			return res;
		})
		.finally(() => {
			inflight = null;
		});
	return inflight;
}

export function useKnowledgeSupportedContentTypes() {
	const mediaTypes = ref(cached?.media_types ?? []);
	const extensions = ref(cached?.extensions ?? []);
	const loading = ref(cached === null);
	const error = ref(null);
	let cancelled = false;

	onMounted(() => {
		if (cached) {
			mediaTypes.value = cached.media_types ?? [];
			extensions.value = cached.extensions ?? [];
			loading.value = false;
			return;
		}
		fetchSupported()
			.then((res) => {
				if (cancelled) return;
				mediaTypes.value = res.media_types ?? [];
				extensions.value = res.extensions ?? [];
			})
			.catch((e) => {
				if (cancelled) return;
				error.value = e;
			})
			.finally(() => {
				if (!cancelled) loading.value = false;
			});
	});

	onUnmounted(() => {
		cancelled = true;
	});

	return { mediaTypes, extensions, loading, error };
}
