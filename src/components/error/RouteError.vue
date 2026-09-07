<template>
	<div class="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
		<div role="alert" class="flex flex-col gap-1">
			<h1 class="text-lg font-semibold">{{ COMMON.error }}</h1>
			<p class="text-sm text-muted-foreground">{{ ERROR.description }}</p>
		</div>
		<pre
			v-if="detail"
			class="text-muted-foreground bg-muted max-w-md overflow-auto rounded-md p-3 text-left text-xs whitespace-pre-wrap"
		>{{ detail }}</pre>
		<div class="flex gap-2">
			<el-button @click="onRetry">{{ ERROR.retry }}</el-button>
			<el-button type="primary" @click="onHome">{{ ERROR.home }}</el-button>
		</div>
	</div>
</template>

<script>
import { computed } from '@vue/composition-api';
import { COMMON, ERROR } from '@/constants/text.js';

/**
 * RouteError —— React 版 errorElement 的 Vue 等价物。
 * 被 onErrorCaptured 捕获后渲染在路由/布局占位区，保留侧边栏可用；
 * 同时可被 App.vue 用作全局兜底。
 */
export default {
	name: 'RouteError',
	props: {
		error: {
			type: [Error, String, Number, Object],
			default: null,
		},
	},
	setup(props, { emit }) {
		const detail = computed(() => {
			const e = props.error;
			if (e instanceof Error) return e.message || null;
			if (typeof e === 'string') return e || null;
			if (typeof e === 'number' || typeof e === 'boolean') return String(e);
			return null;
		});

		function onRetry() {
			emit('retry');
		}

		function onHome() {
			emit('home');
		}

		return {
			COMMON,
			ERROR,
			detail,
			onRetry,
			onHome,
		};
	},
};
</script>
