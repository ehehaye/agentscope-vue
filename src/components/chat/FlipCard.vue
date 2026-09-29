<template>
	<div class="flip-card" :class="[$attrs.class, { 'flip-card-open': visible }]">
		<transition name="flip">
			<div v-if="visible" class="flip-card-inner">
				<!-- 折叠态：醒目提示条 -->
				<button
					v-if="collapsible && collapsed"
					type="button"
					class="flip-card-collapsed-bar"
					:aria-expanded="false"
					@click="toggle"
				>
					<span class="flip-card-collapsed-dot" aria-hidden="true"></span>
					<span class="flip-card-collapsed-label">{{ title }}</span>
					<Icon icon="lucide:chevron-up" class="flip-card-chevron" />
				</button>
				<!-- 展开态：浮动小按钮，叠在 ConfirmCard 右上角内 -->
				<button
					v-else-if="collapsible"
					type="button"
					class="flip-card-toggle"
					:aria-expanded="true"
					title="收起"
					@click="toggle"
				>
					<Icon
						icon="lucide:chevron-up"
						class="flip-card-chevron is-collapsed"
					/>
				</button>
				<div
					class="flip-card-body"
					:class="{ 'is-collapsed': collapsed }"
				>
					<div class="flip-card-body-inner">
						<slot />
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script>
import { defineComponent, ref, watch } from '@/composables/vue';
import { Icon } from '@/components/iconify';

/**
 * 3D 翻转卡片容器。
 * 当 visible 为 true 时从下方 -90° 翻转进入；为 false 时向上 90° 翻转退出。
 * 支持通过 collapsible 启用折叠：
 *   - 展开态：右上角浮动小按钮，叠在 ConfirmCard 内部
 *   - 折叠态：醒目提示条（紫色 accent + 跳动圆点），避免遮挡正文阅读区域
 */
export default defineComponent({
	name: 'FlipCard',
	components: { Icon },
	props: {
		visible: { type: Boolean, default: false },
		collapsible: { type: Boolean, default: true },
		title: { type: String, default: '待处理操作' },
	},
	emits: ['collapse', 'expand'],
	setup(props, { emit }) {
		const collapsed = ref(false);

		// 每次 visible 由 false 变 true（新提示出现）时恢复展开，便于用户立即查看
		watch(
			() => props.visible,
			(v) => {
				if (v) collapsed.value = false;
			},
		);

		function toggle() {
			collapsed.value = !collapsed.value;
			emit(collapsed.value ? 'collapse' : 'expand');
		}

		return { collapsed, toggle };
	},
});
</script>

<style lang="less" scoped>
	.flip-card {
		perspective: 800px;
		perspective-origin: 50% 100%;
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.45s cubic-bezier(0.34, 1.2, 0.64, 1);
		overflow: hidden;

		&-open {
			grid-template-rows: 1fr;
		}

		&-inner {
			position: relative;
			transform-origin: bottom center;
			transform-style: preserve-3d;
			will-change: transform, opacity;
			min-height: 0;
		}

		/* 展开态：浮动按钮叠在 ConfirmCard 右上角内部
		 * right/top 与 ConfirmCard 的 28px 圆角对称：按钮中心落在圆角弧线上 */
		&-toggle {
			position: absolute;
			top: 14px;
			right: 14px;
			z-index: 10;
			width: 22px;
			height: 22px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 0;
			border-radius: 6px;
			border: 1px solid var(--as-border);
			background: var(--as-background);
			color: var(--as-muted-foreground);
			cursor: pointer;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
			transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

			&:hover {
				background: var(--as-accent);
				color: var(--as-foreground);
				border-color: var(--as-ring);
			}

			&:focus-visible {
				outline: 2px solid var(--as-ring);
				outline-offset: 1px;
			}
		}

		/* 折叠态：醒目提示条 */
		&-collapsed-bar {
			display: flex;
			align-items: center;
			gap: 8px;
			width: 100%;
			padding: 6px 12px;
			border-radius: 8px;
			border: 1px solid var(--as-accent-border);
			background: var(--as-accent-bg);
			color: var(--as-foreground);
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;
			user-select: none;
			transition: background 0.2s ease, border-color 0.2s ease;

			&:hover {
				background: var(--as-accent);
				border-color: var(--as-ring);
			}

			&:focus-visible {
				outline: 2px solid var(--as-ring);
				outline-offset: 1px;
			}
		}

		&-collapsed-dot {
			flex: none;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: #aa3bff;
			box-shadow: 0 0 0 0 rgba(170, 59, 255, 0.6);
			animation: flip-card-pulse 1.6s ease-in-out infinite;
		}

		@keyframes flip-card-pulse {
			0%, 100% {
				opacity: 1;
				transform: scale(1);
				box-shadow: 0 0 0 0 rgba(170, 59, 255, 0.5);
			}
			50% {
				opacity: 0.7;
				transform: scale(0.85);
				box-shadow: 0 0 0 6px rgba(170, 59, 255, 0);
			}
		}

		&-collapsed-label {
			flex: 1;
			text-align: left;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		&-chevron {
			flex: none;
			width: 14px;
			height: 14px;
			transition: transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);

			&.is-collapsed {
				transform: rotate(180deg);
			}
		}

		&-body {
			display: grid;
			grid-template-rows: 1fr;
			transition: grid-template-rows 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);

			&.is-collapsed {
				grid-template-rows: 0fr;
			}
		}

		&-body-inner {
			min-height: 0;
			overflow: hidden;
		}
	}

	.flip {
		&-enter-active,
		&-leave-active {
			transition: transform 0.45s cubic-bezier(0.34, 1.2, 0.64, 1),
				opacity 0.45s cubic-bezier(0.34, 1.2, 0.64, 1);
		}

		&-enter {
			transform: rotateX(-90deg);
			opacity: 0;
		}

		&-enter-to {
			transform: rotateX(0deg);
			opacity: 1;
		}

		&-leave {
			transform: rotateX(0deg);
			opacity: 1;
		}

		&-leave-to {
			transform: rotateX(90deg);
			opacity: 0;
		}
	}
</style>
