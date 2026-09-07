import { ref, onMounted } from '@/composables/vue';
import { credentialApi } from '@/api';

/**
 * 凭证 CRUD composable。
 * @returns {{ credentials: Ref<any[]>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]>, create: (body: any) => Promise<any>, update: (id: string, body: any) => Promise<any>, remove: (id: string) => Promise<void> }}
 */
export function useCredentials() {
	const credentials = ref([]);
	const loading = ref(false);
	const error = ref(null);
	let reqId = 0;

	async function refetch() {
		const id = ++reqId;
		loading.value = true;
		error.value = null;
		try {
			const res = await credentialApi.list();
			const list = res?.credentials ?? [];
			if (id === reqId) credentials.value = list;
			return list;
		} catch (e) {
			if (id === reqId) error.value = e;
			return [];
		} finally {
			if (id === reqId) loading.value = false;
		}
	}

	async function create(body) {
		const res = await credentialApi.create(body);
		await refetch();
		return res;
	}

	async function update(credentialId, body) {
		const res = await credentialApi.update(credentialId, body);
		await refetch();
		return res;
	}

	async function remove(credentialId) {
		await credentialApi.delete(credentialId);
		await refetch();
	}

	onMounted(() => {
		refetch();
	});

	return { credentials, loading, error, refetch, create, update, remove };
}
