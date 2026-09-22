<template>
  <el-dialog
    append-to-body
    :visible.sync="visible"
    :title="title"
    width="560px"
    :close-on-click-modal="false"
    @closed="handleClose"
  >
    <ChannelForm v-if="visible" v-model="form" mode="create" :agents="agents" :channel-types="channelTypes" />

    <el-alert v-if="error" :title="error" type="error" class="tw-mt-3" :closable="false" show-icon />

    <span slot="footer" class="tw-dialog-footer">
      <el-button size="small" @click="visible = false">{{ COMMON.cancel }}</el-button>
      <el-button size="small" type="primary" :loading="loading" :disabled="!valid" @click="handleSubmit">{{ COMMON.create }}</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { channelApi } from '@/api';
import ChannelForm, { defaultChannelForm, isChannelFormValid, toCreateRequest } from './ChannelForm.vue';
import { COMMON } from '@/constants/text';

export default defineComponent({
  name: 'CreateChannelDialog',
  components: { ChannelForm },
  props: {
    visible: { type: Boolean, default: false },
    initialType: { type: String, default: '' },
    agents: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    const form = ref(defaultChannelForm(props.agents[0]?.id || ''));
    const channelTypes = ref([]);
    const loading = ref(false);
    const error = ref('');

    const title = computed(() => {
      const picked = channelTypes.value.find((ct) => ct.channel_type === form.value.channelType);
      return picked ? `创建 ${picked.display_name}` : '创建频道';
    });

    const valid = computed(() => isChannelFormValid(form.value, 'create'));

    watch(
      () => props.visible,
      async (open) => {
        if (!open) return;
        form.value = defaultChannelForm(props.agents[0]?.id || '');
        form.value.channelType = props.initialType || 'feishu';
        error.value = '';
        const types = (await channelApi.listTypes()) || [];
        channelTypes.value = types;
        if (!types.some((ct) => ct.channel_type === form.value.channelType)) {
          form.value.channelType = types[0]?.channel_type || form.value.channelType;
        }
      },
    );

    function handleClose() {
      emit('update:visible', false);
    }

    async function handleSubmit() {
      error.value = '';
      loading.value = true;
      try {
        await channelApi.create(toCreateRequest(form.value));
        emit('created');
        emit('update:visible', false);
      } catch (e) {
        error.value = e?.detail || e?.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    return {
      visible: computed({ get: () => props.visible, set: (v) => emit('update:visible', v) }),
      form,
      channelTypes,
      loading,
      error,
      title,
      valid,
      handleClose,
      handleSubmit,
      COMMON,
    };
  },
});
</script>
