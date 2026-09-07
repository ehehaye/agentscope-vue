<template>
  <el-dropdown trigger="click" @command="(v) => $emit('change', v)">
    <span class="el-dropdown-link tw-inline-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-between tw-gap-2 tw-rounded-md tw-border tw-border-border tw-px-3 tw-py-1.5 tw-text-sm hover:tw-bg-row-hover">
      <span class="tw-truncate tw-inline-flex tw-items-center tw-gap-2">
        <Icon icon="lucide:globe" class="tw-h-3.5 tw-w-3.5 tw-shrink-0 tw-text-muted-foreground" />
        <span class="tw-truncate">{{ displayLabel }}</span>
      </span>
      <Icon icon="lucide:chevron-down" class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-muted-foreground" />
    </span>
    <el-dropdown-menu slot="dropdown" class="tw-w-64">
      <div class="tw-flex tw-items-center tw-gap-2 tw-border-b tw-px-3 tw-py-2">
        <Icon icon="lucide:search" class="tw-h-3.5 tw-w-3.5 tw-shrink-0 tw-opacity-50" />
        <el-input
          v-model="search"
          size="mini"
          placeholder="搜索时区"
          class="timezone-search-input"
          @keydown.native.stop
        />
      </div>
      <div class="tw-max-h-60 tw-overflow-y-auto">
        <template v-if="filtered.length === 0">
          <el-dropdown-item disabled>未找到时区</el-dropdown-item>
        </template>
        <template v-else>
          <el-dropdown-item
            v-for="tz in filtered"
            :key="tz"
            :command="tz"
            :class="{ 'tw-bg-accent': value === tz }"
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
