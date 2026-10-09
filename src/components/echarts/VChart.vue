<template>
  <div
    :class="cn('tw-h-full tw-w-full tw-relative', className)"
    :style="{ height }"
  >
    <div
      v-show="!isPrint"
      ref="el"
      class="tw-h-full tw-w-full"
    ></div>
    <img
      v-if="isPrint && img"
      class="tw-h-full tw-w-full tw-z-10 tw-top-0 tw-left-0"
      :src="img"
    />
  </div>
</template>

<script>
import * as echarts from 'echarts';
import {
  defineComponent,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  getCurrentInstance,
  nextTick,
} from '@/composables/vue';
import { usePrintEvents } from '@/composables/usePrintEvents';
import { cn } from '@/lib/utils';

export default defineComponent({
  name: 'VChart',
  props: {
    /** ECharts option 配置 */
    option: { type: Object, required: true },
    /** 主题：'light' | 'dark' | 自定义主题对象，变更时会重建实例 */
    theme: { type: [String, Object], default: undefined },
    /** echarts.init 初始化参数（renderer、devicePixelRatio 等），变更时会重建实例 */
    initOptions: { type: Object, default: undefined },
    /** setOption 更新参数（notMerge、lazyUpdate、replaceMerge 等） */
    updateOptions: { type: Object, default: () => ({}) },
    /** 图表分组，用于多图表联动（connect） */
    group: { type: String, default: undefined },
    /** 是否显示 ECharts 内置 loading 动画 */
    loading: { type: Boolean, default: false },
    /** 容器尺寸变化时是否自动 resize */
    autoResize: { type: Boolean, default: true },
    /** 容器内联样式，建议至少显式指定宽高，否则依赖父容器撑开 */
    height: { type: String, default: '300px' },
    className: { type: String, default: '' },
  },
  setup(props, { emit }) {
    const el = ref(null);
    const instance = getCurrentInstance();

    // ECharts 实例不参与响应式，避免深度代理带来的性能问题
    let chart = null;
    let resizeObserver = null;
    let resizeFrame = 0;

    /** 将父级 $listeners 转发为 ECharts 事件（如 click、mouseover），查找当前监听器，父级更新处理器无需重新绑定 */
    const bindEchartsEvents = () => {
      const listeners = instance.proxy.$listeners || {};
      Object.keys(listeners).forEach((eventName) => {
        chart.on(eventName, (params) => {
          const handler = (instance.proxy.$listeners || {})[eventName];
          if (handler) handler(params);
        });
      });
    };

    const initChart = () => {
      if (!el.value) return;
      chart = echarts.init(el.value, props.theme, { renderer: 'svg', ...props.initOptions });
      chart.setOption(props.option, { ...props.updateOptions });
      if (props.group) chart.group = props.group;
      if (props.loading) chart.showLoading();
      bindEchartsEvents();
      emit('ready', chart);
    };

    const disposeChart = () => {
      if (!chart) return;
      chart.dispose();
      chart = null;
    };

    const scheduleResize = () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        // 容器不可见（宽高为 0）时跳过，尺寸恢复后观察器会再次触发
        if (chart && el.value && el.value.clientWidth > 0 && el.value.clientHeight > 0) {
          chart.resize();
        }
      });
    };

    const isPrint = ref(false);
    const img = ref(null);

    usePrintEvents({
      beforePrint: () => {
        isPrint.value = true;
      },
      afterPrint: () => {
        isPrint.value = false;
      },
    });

    watch(isPrint, (bool) => {
      if (bool) {
        img.value = chart?.getDataURL({
          type: 'png',
          pixelRatio: 3, // 高清
          backgroundColor: '#fff',
          excludeComponents: ['toolbox'],
        });
      } else {
        img.value = '';
      }
    });

    onMounted(() => {
      requestAnimationFrame(() => {
        initChart();
        if (props.autoResize && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(scheduleResize);
          resizeObserver.observe(el.value);
        }
      });
    });

    onBeforeUnmount(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
      }
      disposeChart();
    });

    watch(
      () => props.option,
      (option) => {
        if (chart) chart.setOption(option, { ...props.updateOptions });
      },
      { deep: true },
    );

    watch(
      () => [props.theme, props.initOptions],
      () => {
        disposeChart();
        initChart();
      },
    );

    watch(
      () => props.group,
      (group) => {
        if (chart) chart.group = group;
      },
    );

    watch(
      () => props.loading,
      (loading) => {
        if (!chart) return;
        if (loading) {
          chart.showLoading();
        } else {
          chart.hideLoading();
        }
      },
    );

    return { el, isPrint, img, cn, getChart: () => chart };
  },
});
</script>
