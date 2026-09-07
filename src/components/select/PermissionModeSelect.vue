<template>
  <el-dropdown trigger="click" @command="(v) => $emit('change', v)">
    <span
      class="el-dropdown-link inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-row-hover"
    >
      <span class="truncate">{{ displayLabel }}</span>
      <Icon icon="lucide:chevron-down" class="h-4 w-4 shrink-0 text-muted-foreground" />
    </span>
    <el-dropdown-menu slot="dropdown">
      <el-dropdown-item disabled>权限模式</el-dropdown-item>
      <el-dropdown-item
        v-for="mode in MODES"
        :key="mode.value"
        :command="mode.value"
        :class="{ 'bg-accent': value === mode.value }"
        :title="mode.desc"
      >
        {{ mode.label }}
      </el-dropdown-item>
    </el-dropdown-menu>
  </el-dropdown>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';

const MODES = [
  { value: 'default', label: 'Default', desc: '默认权限策略' },
  { value: 'accept_edits', label: 'Accept Edits', desc: '接受用户编辑' },
  { value: 'explore', label: 'Explore', desc: '探索模式' },
  { value: 'bypass', label: 'Bypass', desc: '绕过确认' },
  { value: 'dont_ask', label: "Don't Ask", desc: '不再询问' },
];

export default defineComponent({
  name: 'PermissionModeSelect',
  components: { Icon },
  props: {
    value: { type: String, default: '' },
  },
  setup(props) {
    const displayLabel = computed(() => {
      const found = MODES.find((m) => m.value === props.value);
      return found?.label || props.value || '选择权限模式';
    });
    return { MODES, displayLabel };
  },
});
</script>
