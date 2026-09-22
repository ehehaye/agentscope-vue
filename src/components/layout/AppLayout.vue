<template>
	<div class="tw-app-layout tw-flex tw-h-full tw-w-full tw-overflow-hidden">
		<AppSidebar />
		<main class="tw-flex-1 tw-overflow-hidden">
			<transition name="fade" mode="out-in">
				<router-view />
			</transition>
		</main>
	</div>
</template>

<script>
import AppSidebar from './AppSidebar.vue';

export default {
	name: 'AppLayout',
	components: { AppSidebar },
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
