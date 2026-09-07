import { ref, onMounted } from '@/composables/vue';
import { channelApi } from '@/api';

/**
 * Channel 列表 CRUD composable。
 * @returns {{ channels: Ref<any[]>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]>, create: (body: any) => Promise<any>, update: (id: string, body: any) => Promise<any>, remove: (id: string) => Promise<void>, enable: (id: string) => Promise<void>, disable: (id: string) => Promise<void> }}
 */
export function useChannels() {
	const channels = ref([]);
	const loading = ref(false);
	const error = ref(null);
	let reqId = 0;

	async function refetch() {
		const id = ++reqId;
		loading.value = true;
		error.value = null;
		try {
			const res = await channelApi.list();
			const list = Array.isArray(res) ? res : res ?? [];
			if (id === reqId) channels.value = list;
			return list;
		} catch (e) {
			if (id === reqId) error.value = e;
			return [];
		} finally {
			if (id === reqId) loading.value = false;
		}
	}

	async function create(body) {
		const res = await channelApi.create(body);
		await refetch();
		return res;
	}

	async function update(channelId, body) {
		const res = await channelApi.update(channelId, body);
		await refetch();
		return res;
	}

	async function remove(channelId) {
		await channelApi.delete(channelId);
		await refetch();
	}

	async function enable(channelId) {
		await channelApi.enable(channelId);
		await refetch();
	}

	async function disable(channelId) {
		await channelApi.disable(channelId);
		await refetch();
	}

	onMounted(() => {
		refetch();
	});

	return { channels, loading, error, refetch, create, update, remove, enable, disable };
}
