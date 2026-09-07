<template>
	<div id="app" class="tw-h-full tw-w-full">
		<RouteError v-if="err" :error="err" @retry="handleRetry" @home="handleHome" />
		<router-view v-else />
	</div>
</template>

<script>
import {
	ref,
	watch,
	onMounted,
	onUnmounted,
	onErrorCaptured,
} from '@/composables/vue';
import { useStore } from '@/composables/vuex';
import { useRouter } from '@/composables/vue-router';
import RouteError from '@/components/error/RouteError.vue';

export default {
	name: 'App',
	components: { RouteError },
	setup() {
		const store = useStore();
		const router = useRouter();
		const err = ref(null);
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

		onErrorCaptured((e) => {
			err.value = e;
			console.error('tw-[App] tw-error tw-captured', e);
			return false;
		});

		function handleRetry() {
			window.location.reload();
		}

		function handleHome() {
			err.value = null;
			if (router) router.push('/');
		}

		return {
			err,
			handleRetry,
			handleHome,
		};
	},
};
</script>
