<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :title="title"
    width="420px"
    :close-on-click-modal="false"
  >
    <p class="text-sm text-muted-foreground">{{ description }}</p>
    <span slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="danger" :loading="loading" @click="handleConfirm">删除</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent } from '@/composables/vue';

export default defineComponent({
  name: 'DeleteDialog',
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '确认删除' },
    description: { type: String, default: '删除后无法恢复，是否继续？' },
    loading: { type: Boolean, default: false },
  },
  computed: {
    dialogVisible: {
      get() { return this.$props.visible; },
      set(val) { this.$emit('update:visible', val); },
    },
  },
  methods: {
    handleConfirm() {
      this.$emit('confirm');
    },
  },
});
</script>
