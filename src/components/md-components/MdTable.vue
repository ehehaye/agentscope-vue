<template>
  <div class="md-table-wrapper">
    <el-button
      type="text"
      class="md-table-export-btn"
      title="导出表格"
      @click.stop="onExport"
    >
      <i class="el-icon-download"></i>
    </el-button>
    <table
      ref="tableEl"
      class="md-table"
    >
      <slot />
    </table>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { downloadXlsxFromTable } from '@/utils/xlsx';

export default defineComponent({
  name: 'TableWithExportBtn',
  props: {
    node: {
      type: Object,
      default: null,
    },
  },
  methods: {
    onExport() {
      downloadXlsxFromTable(this.$refs.tableEl);
    },
  },
});
</script>

<style lang="less" scoped>
.md-table-wrapper {
  position: relative;

  .md-table-export-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 1;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background-color: transparent;
    color: var(--as-text-secondary, #909399);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 0.15s ease,
      background-color 0.15s ease,
      color 0.15s ease;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      color: var(--as-primary, #409eff);
      background-color: var(--as-surface-muted, rgba(0, 0, 0, 0.04));
      opacity: 1;
    }

    &:focus {
      outline: none;
      opacity: 1;
    }
  }

  &:hover .md-table-export-btn {
    opacity: 0.4;
  }
}
</style>
