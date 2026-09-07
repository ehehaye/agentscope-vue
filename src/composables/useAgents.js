import { ref, onMounted } from '@/composables/vue';
import { agentApi } from '@/api';

/**
 * Agent 列表 CRUD composable。
 * @returns {{ agents: Ref<any[]>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]>, create: (body: any, options?: any) => Promise<any>, update: (id: string, body: any, options?: any) => Promise<any>, remove: (id: string) => Promise<void> }}
 */
export function useAgents() {
	const agents = ref([]);
	const loading = ref(false);
	const error = ref(null);
	let reqId = 0;

	async function refetch() {
		const id = ++reqId;
		loading.value = true;
		error.value = null;
		try {
			const res = await agentApi.list();
			const list = res?.agents ?? [];
			if (id === reqId) agents.value = list;
			return list;
		} catch (e) {
			if (id === reqId) error.value = e;
			return [];
		} finally {
			if (id === reqId) loading.value = false;
		}
	}

	async function create(body, options) {
		const res = await agentApi.create(body, options);
		await refetch();
		return res;
	}

	async function update(agentId, body, options) {
		const res = await agentApi.update(agentId, body, options);
		await refetch();
		return res;
	}

	async function remove(agentId) {
		await agentApi.delete(agentId);
		await refetch();
	}

	onMounted(() => {
		refetch();
	});

	return { agents, loading, error, refetch, create, update, remove };
}
