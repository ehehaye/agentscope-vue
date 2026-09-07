<template>
	<div class="tw-flex tw-h-full tw-w-full tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-p-8 tw-text-center">
		<div role="alert" class="tw-flex tw-flex-col tw-gap-1">
			<h1 class="tw-text-lg tw-font-semibold">{{ COMMON.error }}</h1>
			<p class="tw-text-sm tw-text-muted-foreground">{{ ERROR.description }}</p>
		</div>
		<pre
			v-if="detail"
			class="tw-text-muted-foreground tw-bg-muted tw-max-w-md tw-overflow-auto tw-rounded-md tw-p-3 tw-text-left tw-text-xs tw-whitespace-pre-wrap"
		>{{ detail }}</pre>
		<div class="tw-flex tw-gap-2">
			<el-button @click="onRetry">{{ ERROR.retry }}</el-button>
			<el-button type="primary" @click="onHome">{{ ERROR.home }}</el-button>
		</div>
	</div>
</template>

<script>
import { computed } from '@/composables/vue';
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
