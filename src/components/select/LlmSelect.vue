<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <span
      class="el-dropdown-link inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-row-hover"
      :class="{ 'opacity-50': loading }"
    >
      <span class="truncate">{{ displayLabel }}</span>
      <Icon icon="lucide:chevron-down" class="h-4 w-4 shrink-0 text-muted-foreground" />
    </span>
    <el-dropdown-menu slot="dropdown" class="max-h-72 overflow-y-auto">
      <template v-if="!loading && groupEntries.length === 0">
        <el-dropdown-item disabled>暂无可用模型</el-dropdown-item>
        <el-dropdown-item command="NEW_CREDENTIAL" class="text-xs">
          <span class="inline-flex items-center gap-1">
            <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
            新建凭证
          </span>
        </el-dropdown-item>
      </template>
      <template v-else>
        <template v-for="(entry, idx) in groupEntries">
          <el-dropdown-item v-if="idx > 0" :key="'sep-' + entry[0]" divided disabled>
            {{ entry[0].replace(/_credential$/, '') }}
          </el-dropdown-item>
          <el-dropdown-item v-else :key="'label-' + entry[0]" disabled>
            {{ entry[0].replace(/_credential$/, '') }}
          </el-dropdown-item>

          <template v-if="entry[1].length === 1">
            <el-dropdown-item
              v-for="m in entry[1][0].models"
              :key="m.name"
              :command="{ type: entry[0], credential_id: entry[1][0].credential.id, model: m.name }"
              :class="{ 'bg-accent': isSelected(entry[1][0].credential.id, m.name) }"
            >
              {{ m.label || m.name }}
            </el-dropdown-item>
          </template>
          <template v-else>
            <el-dropdown-item
              v-for="item in entry[1]"
              :key="item.credential.id"
              :command="null"
              class="has-submenu"
            >
              <el-dropdown placement="right-start" @command="handleCommand">
                <span class="inline-flex w-full items-center justify-between">
                  {{ credentialLabel(item.credential) }}
                  <Icon icon="lucide:chevron-right" class="ml-2 h-3.5 w-3.5" />
                </span>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item
                    v-for="m in item.models"
                    :key="m.name"
                    :command="{ type: entry[0], credential_id: item.credential.id, model: m.name }"
                    :class="{ 'bg-accent': isSelected(item.credential.id, m.name) }"
                  >
                    {{ m.label || m.name }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </el-dropdown-item>
          </template>
        </template>
        <el-dropdown-item divided command="NEW_CREDENTIAL">
          <span class="inline-flex items-center gap-1">
            <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
            新建凭证
          </span>
        </el-dropdown-item>
      </template>
    </el-dropdown-menu>
  </el-dropdown>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { useAvailableModels } from '@/composables/useAvailableModels';
import { credentialLabel } from '@/utils/common';

export default defineComponent({
  name: 'LlmSelect',
  components: { Icon },
  props: {
    value: { type: Object, default: null },
    placeholder: { type: String, default: '选择模型' },
  },
  setup(props, { emit }) {
    const { groups, loading } = useAvailableModels();

    const groupEntries = computed(() =>
      Object.entries(groups.value)
        .map(([type, items]) => [type, items.filter((i) => i.models.length > 0)])
        .filter(([, usable]) => usable.length > 0),
    );

    const displayLabel = computed(() => {
      if (props.value?.model) return props.value.model;
      if (loading.value) return '加载中…';
      return props.placeholder;
    });

    function isSelected(credentialId, modelName) {
      return props.value?.credential_id === credentialId && props.value?.model === modelName;
    }

    function handleCommand(cmd) {
      if (!cmd) return;
      if (cmd === 'NEW_CREDENTIAL') {
        emit('add-credential');
        return;
      }
      emit('change', { type: cmd.type, credential_id: cmd.credential_id, model: cmd.model, parameters: {} });
    }

    return { groups, loading, groupEntries, displayLabel, isSelected, handleCommand, credentialLabel };
  },
});
</script>
