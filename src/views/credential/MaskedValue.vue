<template>
  <span class="inline-flex items-center gap-2 font-mono text-sm">
    <span>{{ visible ? value : masked }}</span>
    <el-button type="text" size="mini" @click="visible = !visible">
      <Icon :icon="visible ? 'lucide:eye-off' : 'lucide:eye'" class="h-4 w-4" />
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
