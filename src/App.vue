<template>
	<div id="app" class="tw-h-full tw-w-full">
		<router-view />
	</div>
</template>

<script>
import { watch, onMounted, onUnmounted } from '@/composables/vue';
import { useStore } from '@/composables/vuex';

export default {
	name: 'App',
	setup() {
		const store = useStore();
		let handler = null;

		function syncBeforeUnload(hasInFlight) {
			if (handler) {
				window.removeEventListener('beforeunload', handler);
				handler = null;
			}
			if (hasInFlight) {
				handler = (e) => {
					e.preventDefault();
					e.returnValue = '';
				};
				window.addEventListener('beforeunload', handler);
			}
		}

		onMounted(() => {
			syncBeforeUnload(store.getters['upload/hasInFlight']);
		});

		watch(
			() => store.getters['upload/hasInFlight'],
			(val) => syncBeforeUnload(val),
		);

		onUnmounted(() => {
			if (handler) window.removeEventListener('beforeunload', handler);
		});

		return {};
	},
};
</script>
