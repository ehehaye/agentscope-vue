<template>
  <el-dialog
    title="重命名会话"
    :visible.sync="dialogVisible"
    width="420px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form label-position="top">
      <el-form-item label="会话名称">
        <el-input
          v-model="name"
          placeholder="输入新的会话名称"
          @keyup.enter.native="handleConfirm"
        />
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false" :disabled="submitting">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!name.trim()" @click="handleConfirm">
        确认
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';

export default defineComponent({
  name: 'RenameSessionDialog',
  props: {
    visible: { type: Boolean, default: false },
    currentName: { type: String, default: '' },
  },
  emits: ['update:visible', 'confirm'],
  setup(props, { emit }) {
    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });
    const name = ref('');
    const submitting = ref(false);

    watch(() => props.visible, (v) => {
      if (v) name.value = props.currentName;
    });

    async function handleConfirm() {
      if (!name.value.trim()) return;
      submitting.value = true;
      try {
        await emit('confirm', name.value.trim());
        dialogVisible.value = false;
      } finally {
        submitting.value = false;
      }
    }

    return { dialogVisible, name, submitting, handleConfirm };
  },
});
</script>
