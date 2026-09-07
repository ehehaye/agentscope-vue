<template>
	<div class="tw-app-layout tw-flex tw-h-full tw-w-full tw-overflow-hidden">
		<AppSidebar />
		<main class="tw-flex-1 tw-overflow-hidden">
			<RouteError v-if="err" :error="err" @retry="handleRetry" @home="handleHome" />
			<transition v-else name="fade" mode="out-in">
				<router-view />
			</transition>
		</main>
	</div>
</template>

<script>
import { ref, onErrorCaptured } from '@/composables/vue';
import { useRouter } from '@/composables/vue-router';
import AppSidebar from './AppSidebar.vue';
import RouteError from '@/components/error/RouteError.vue';

export default {
	name: 'AppLayout',
	components: { AppSidebar, RouteError },
	setup() {
		const router = useRouter();
		const err = ref(null);

		onErrorCaptured((e) => {
			err.value = e;
			console.error('tw-[AppLayout] tw-error tw-captured', e);
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

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter,
.fade-leave-to {
	opacity: 0;
}
</style>
