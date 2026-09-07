<template>
  <span class="tw-inline-flex tw-items-center tw-gap-2 tw-font-mono tw-text-sm">
    <span>{{ visible ? value : masked }}</span>
    <el-button type="text" size="mini" @click="visible = !visible">
      <Icon :icon="visible ? 'lucide:eye-off' : 'lucide:eye'" class="tw-h-4 tw-w-4" />
    </el-button>
  </span>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';

export default defineComponent({
  name: 'MaskedValue',
  components: { Icon },
  props: {
    value: { type: String, default: '' },
  },
  data() {
    return { visible: false };
  },
  computed: {
    masked() {
      const v = this.value;
      if (v.length > 8) return v.slice(0, 4) + '••••••••' + v.slice(-4);
      return '••••••••';
    },
  },
});
</script>
