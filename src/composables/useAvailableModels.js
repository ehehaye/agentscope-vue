import { ref, onMounted } from '@/composables/vue';
import { credentialApi, modelApi } from '@/api';

/**
 * 拉取所有凭证及其可用模型，按凭证类型分组。
 * @returns {{ groups: Ref<Record<string, any[]>>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<void> }}
 */
export function useAvailableModels() {
	const groups = ref({});
	const loading = ref(false);
	const error = ref(null);

	async function refetch() {
		loading.value = true;
		error.value = null;
		try {
			const { credentials = [] } = await credentialApi.list();
			const result = {};
			await Promise.all(
				credentials.map(async (credential) => {
					const type = credential.data?.type;
					if (!type) return;
					if (!result[type]) result[type] = [];
					try {
						const { models = [] } = await modelApi.list(type);
						result[type].push({
							credential,
							models: [...models].sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true })),
						});
					} catch {
						result[type].push({ credential, models: [] });
					}
				}),
			);
			groups.value = result;
		} catch (e) {
			error.value = e;
			groups.value = {};
		} finally {
			loading.value = false;
		}
	}

	onMounted(() => {
		refetch();
	});

	return { groups, loading, error, refetch };
}
