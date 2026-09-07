import { ref, computed, onMounted } from '@/composables/vue';

/**
 * 通用资源列表 composable。
 * 覆盖「列表 + loading + error + 自动刷新」的同构模式。
 *
 * @param {(params?: any) => Promise<any>} listFn 返回列表或 { list: any[] }
 * @param {object} [opts]
 * @param {boolean} [opts.immediate=true] 是否 onMounted 自动拉取
 * @param {boolean} [opts.byId=false] 是否额外返回 itemsById
 * @param {(item: any) => string|number} [opts.idKey=(i)=>i.id] 用于 byId
 */
export function useResourceList(listFn, opts = {}) {
	const { immediate = true, byId = false, idKey = (item) => item?.id } = opts;

	const items = ref([]);
	const loading = ref(false);
	const error = ref(null);
	let reqId = 0;

	async function refetch(params) {
		const id = ++reqId;
		loading.value = true;
		error.value = null;
		try {
			const res = await listFn(params);
			const list = Array.isArray(res) ? res : res?.list ?? [];
			if (id === reqId) {
				items.value = list;
			}
			return list;
		} catch (e) {
			if (id === reqId) {
				error.value = e;
			}
			return [];
		} finally {
			if (id === reqId) {
				loading.value = false;
			}
		}
	}

	function clear() {
		items.value = [];
		error.value = null;
	}

	function setItems(list) {
		items.value = list;
	}

	const itemsById = computed(() => {
		const map = {};
		for (const item of items.value) {
			const key = idKey(item);
			if (key != null) map[key] = item;
		}
		return map;
	});

	if (immediate) {
		onMounted(() => {
			refetch();
		});
	}

	const result = { items, loading, error, refetch, clear, setItems };
	if (byId) result.itemsById = itemsById;
	return result;
}

/**
 * 派生 CRUD composable 工厂。
 * 在 useResourceList 上叠加 create/update/remove，调 api 成功后自动 refetch。
 *
 * @param {object} api { list, create, update, remove }
 * @param {object} [opts] 透传给 useResourceList
 */
export function useResourceCrud(api, opts = {}) {
	const { items, loading, error, refetch, clear, setItems } = useResourceList(api.list, opts);

	async function create(payload, params) {
		const res = await api.create(payload, params);
		await refetch();
		return res;
	}

	async function update(id, payload, params) {
		const res = await api.update(id, payload, params);
		await refetch();
		return res;
	}

	async function remove(id, params) {
		const res = await api.remove(id, params);
		await refetch();
		return res;
	}

	return {
		items,
		loading,
		error,
		refetch,
		clear,
		setItems,
		create,
		update,
		remove,
	};
}
