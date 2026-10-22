<template>
  <div class="tw-flex tw-shrink-0 tw-items-center tw-py-3 tw-ml-2">
    <el-tabs
      :value="String(activeIndex)"
      class="sop-step-tabs"
      @tab-click="handleTabClick"
    >
      <el-tab-pane
        v-for="item in steps"
        :key="item.index"
        :name="String(item.index)"
        :disabled="isPending(item)"
      >
        <template slot="label">
          <span
            :data-step-index="item.index"
            :title="[item.definition.subject, item.definition.description].filter(Boolean).join('\n')"
            class="tw-flex tw-w-48 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-px-3 tw-py-2 tw-mx-1 tw-text-left tw-transition-colors xl:tw-w-56"
            :class="[
              item.index === activeIndex ? 'tw-border-primary tw-bg-muted' : 'tw-border-border',
              isPending(item)
                ? 'tw-cursor-not-allowed tw-opacity-50'
                : 'tw-cursor-pointer hover:tw-border-primary hover:tw-bg-muted',
            ]"
          >
            <span
              class="tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-secondary tw-text-10px tw-font-medium"
            >
              {{ item.index + 1 }}
            </span>
            <span class="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm tw-font-medium">{{
              item.definition.subject
            }}</span>
            <StatusBadge
              class="tw-shrink-0"
              :status="item.state.phase || 'pending'"
            />
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';

export default defineComponent({
  name: 'SopStepStrip',
  components: { StatusBadge },
  props: {
    steps: { type: Array, default: () => [] },
    activeIndex: { type: Number, default: 0 },
  },
  emits: ['select'],
  setup(props, { emit }) {
    function isPending(item) {
      const phase = item.state?.phase;
      return !phase || phase === 'pending';
    }

    // el-tabs 负责溢出滚动与激活项自动可见，点击后只把下标抛给父组件。
    function handleTabClick(pane) {
      const index = Number(pane?.name);
      if (Number.isNaN(index) || index === props.activeIndex) return;
      emit('select', index);
    }

    return { isPending, handleTabClick };
  },
});
</script>

<style lang="less" scoped>
.sop-step-tabs {
  flex: 1;
  min-width: 0;

  // 去掉 el-tabs 默认的下划线、内容区与内边距，只留步骤卡片本身。
  ::v-deep .el-tabs__header {
    margin: 0;
  }

  ::v-deep .el-tabs__nav-wrap::after {
    display: none;
  }

  ::v-deep .el-tabs__active-bar {
    display: none;
  }

  ::v-deep .el-tabs__content {
    display: none;
  }

  // 固定左右留白：无溢出时与页面内容对齐，溢出时正好容纳左右箭头。
  ::v-deep .el-tabs__nav-wrap {
    padding: 0 16px;
  }

  ::v-deep .el-tabs__item {
    height: auto;
    padding: 0;
    line-height: normal;

    & + & {
      margin-left: 8px;
    }

    &.is-disabled {
      color: inherit;
      cursor: default;
    }
  }

  ::v-deep .el-tabs__nav-prev,
  ::v-deep .el-tabs__nav-next {
    z-index: 3;
    color: var(--as-muted-foreground);
  }
}
</style>
