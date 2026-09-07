<template>
  <el-dropdown trigger="click" @command="(v) => $emit('change', v)">
    <span class="el-dropdown-link inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-row-hover">
      <span class="truncate inline-flex items-center gap-2">
        <Icon icon="lucide:globe" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span class="truncate">{{ displayLabel }}</span>
      </span>
      <Icon icon="lucide:chevron-down" class="h-4 w-4 shrink-0 text-muted-foreground" />
    </span>
    <el-dropdown-menu slot="dropdown" class="w-64">
      <div class="flex items-center gap-2 border-b px-3 py-2">
        <Icon icon="lucide:search" class="h-3.5 w-3.5 shrink-0 opacity-50" />
        <el-input
          v-model="search"
          size="mini"
          placeholder="搜索时区"
          class="timezone-search-input"
          @keydown.native.stop
        />
      </div>
      <div class="max-h-60 overflow-y-auto">
        <template v-if="filtered.length === 0">
          <el-dropdown-item disabled>未找到时区</el-dropdown-item>
        </template>
        <template v-else>
          <el-dropdown-item
            v-for="tz in filtered"
            :key="tz"
            :command="tz"
            :class="{ 'bg-accent': value === tz }"
          >
            {{ tz }}
          </el-dropdown-item>
        </template>
      </div>
    </el-dropdown-menu>
  </el-dropdown>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';

const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function getAllTimezones() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [LOCAL_TIMEZONE];
  }
}

export default defineComponent({
  name: 'TimezoneSelect',
  components: { Icon },
  props: {
    value: { type: String, default: '' },
    placeholder: { type: String, default: '选择时区' },
  },
  setup(props) {
    const search = ref('');
    const allTimezones = getAllTimezones();

    const filtered = computed(() => {
      const q = search.value.trim().toLowerCase();
      if (!q) return allTimezones;
      return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
    });

    const displayLabel = computed(() => props.value || LOCAL_TIMEZONE);

    return { search, filtered, displayLabel };
  },
});
</script>

<style scoped>
.timezone-search-input >>> .el-input__inner {
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  font-size: 12px;
}
</style>
