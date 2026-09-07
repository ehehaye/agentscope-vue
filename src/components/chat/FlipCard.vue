<template>
	<div class="flip-card" :class="$attrs.class">
		<transition name="flip">
			<div v-if="visible" class="flip-card-inner">
				<slot />
			</div>
		</transition>
	</div>
</template>

<script>
import { defineComponent } from '@/composables/vue';

/**
 * 3D 翻转卡片容器。
 * 当 visible 为 true 时从下方 -90° 翻转进入；为 false 时向上 90° 翻转退出。
 */
export default defineComponent({
	name: 'FlipCard',
	props: {
		visible: { type: Boolean, default: false },
	},
});
</script>

<style scoped>
.flip-card {
	perspective: 800px;
	perspective-origin: 50% 100%;
}

.flip-card-inner {
	transform-origin: bottom center;
	transform-style: preserve-3d;
	will-change: transform, opacity;
}

.flip-enter-active,
.flip-leave-active {
	transition: transform 0.45s cubic-bezier(0.34, 1.2, 0.64, 1),
		opacity 0.45s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.flip-enter {
	transform: rotateX(-90deg);
	opacity: 0;
}

.flip-enter-to {
	transform: rotateX(0deg);
	opacity: 1;
}

.flip-leave {
	transform: rotateX(0deg);
	opacity: 1;
}

.flip-leave-to {
	transform: rotateX(90deg);
	opacity: 0;
}
</style>
