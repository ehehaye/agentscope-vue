<template>
  <el-dialog
    :visible.sync="visible"
    title="编辑频道"
    width="560px"
    :close-on-click-modal="false"
    @closed="handleClose"
  >
    <ChannelForm v-if="visible && channel" v-model="form" mode="edit" :agents="agents" :channel-types="channelTypes" />

    <el-alert v-if="error" :title="error" type="error" class="mt-3" :closable="false" show-icon />

    <span slot="footer" class="dialog-footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="!valid" @click="handleSubmit">保存</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import { channelApi } from '@/api';
import ChannelForm, { channelFormFromRecord, isChannelFormValid, toUpdateRequest } from './ChannelForm.vue';

export default defineComponent({
  name: 'EditChannelDialog',
  components: { ChannelForm },
  props: {
    visible: { type: Boolean, default: false },
    channel: { type: Object, default: null },
    agents: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    const form = ref(channelFormFromRecord(props.channel || {}));
    const channelTypes = ref([]);
    const loading = ref(false);
    const error = ref('');

    const valid = computed(() => isChannelFormValid(form.value, 'edit'));

    watch(
      () => [props.visible, props.channel],
      ([open]) => {
        if (open && props.channel) {
          form.value = channelFormFromRecord(props.channel);
          error.value = '';
          channelApi
            .listTypes()
            .then((types) => {
              channelTypes.value = types || [];
            })
            .catch(() => {});
        }
      },
    );

    function handleClose() {
      emit('update:visible', false);
    }

    async function handleSubmit() {
      if (!props.channel) return;
      error.value = '';
      loading.value = true;
      try {
        await channelApi.update(props.channel.id, toUpdateRequest(form.value));
        emit('updated');
        emit('update:visible', false);
      } catch (e) {
        error.value = e?.detail || e?.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    return { visible: computed({ get: () => props.visible, set: (v) => emit('update:visible', v) }), form, channelTypes, loading, error, valid, handleClose, handleSubmit };
  },
});
</script>
