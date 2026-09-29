<template>
  <span class="tw-block">
    <el-button type="primary" size="small" class="tw-w-full" @click="open = true">
      <slot>
        <Icon icon="lucide:plus-circle" class="tw-h-4 tw-w-4" />
        添加 MCP
      </slot>
    </el-button>

    <el-dialog
      title="添加 MCP"
      :visible.sync="open"
      width="640px"
      :close-on-click-modal="false"
      append-to-body
      @closed="reset"
    >
      <p class="tw-mb-3 tw-text-sm tw-text-muted-foreground">从已安装的 MCP 中选择，或粘贴一份配置。</p>

      <el-tabs v-model="tab">
        <el-tab-pane label="从已安装中选择" name="installed">
          <div class="tw-h-80 tw-overflow-y-auto">
            <div v-if="loading" class="tw-flex tw-justify-center tw-py-10">
              <Spinner class="tw-h-6 tw-w-6" />
            </div>
            <div v-else-if="mcps.length === 0" class="tw-py-10 tw-text-center tw-text-sm tw-text-muted-foreground">
              还没有已安装的 MCP，请先到「MCP 中心」安装。
            </div>
            <div v-else class="tw-space-y-1">
              <label
                v-for="mcp in mcps"
                :key="mcp.id"
                class="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-2 tw-transition-colors"
                :class="
                  present.has(mcp.name) ? 'tw-cursor-not-allowed tw-opacity-60' : 'tw-cursor-pointer hover:tw-bg-muted'
                "
              >
                <el-checkbox
                  :value="present.has(mcp.name) || picked.has(mcp.id)"
                  :disabled="present.has(mcp.name)"
                  @change="() => toggle(mcp)"
                />
                <img v-if="mcp.icon_url" :src="mcp.icon_url" class="tw-h-8 tw-w-8 tw-rounded-md tw-object-cover" />
                <div
                  v-else
                  class="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-xs tw-font-bold"
                >
                  {{ (mcp.display_name || mcp.name).slice(0, 1).toUpperCase() }}
                </div>
                <div class="tw-min-w-0 tw-flex-1">
                  <div class="tw-flex tw-items-center tw-gap-2">
                    <span class="tw-font-medium">{{ mcp.display_name || mcp.name }}</span>
                    <span v-if="mcp.author" class="tw-text-xs tw-text-muted-foreground">@{{ mcp.author }}</span>
                  </div>
                  <p class="tw-line-clamp-1 tw-text-xs tw-text-muted-foreground">{{ mcp.description }}</p>
                </div>
              </label>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="粘贴配置" name="configure">
          <div class="tw-h-80 tw-overflow-y-auto">
            <MCPConfigForm :value.sync="configValue" :stateful.sync="keepAlive" />
          </div>
        </el-tab-pane>
      </el-tabs>

      <p
        v-if="error"
        class="tw-mt-3 tw-mb-0 tw-whitespace-pre-wrap tw-rounded-md tw-bg-red-50 tw-p-2 tw-text-xs tw-text-red-600 dark:tw-bg-red-950 dark:tw-text-red-400"
      >
        {{ error }}
      </p>

      <span slot="footer" class="tw-dialog-footer">
        <span class="tw-mr-3 tw-text-xs tw-text-muted-foreground">
          {{ tab === 'installed' && selectable.length > 0 ? `已选 ${picked.size} / ${selectable.length}` : '' }}
        </span>
        <el-button size="small" :disabled="busy" @click="open = false">取消</el-button>
        <el-button
          v-if="tab === 'installed'"
          size="small"
          type="primary"
          :loading="busy"
          :disabled="picked.size === 0"
          @click="addPicked"
        >
          添加
        </el-button>
        <el-button v-else size="small" type="primary" :loading="busy" @click="addFromConfig">添加</el-button>
      </span>
    </el-dialog>
  </span>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { Icon } from '@/components/iconify/index';
import Spinner from '@/components/ui/Spinner.vue';
import { useMCPs } from '@/composables/useMCPs';
import MCPConfigForm from './MCPConfigForm.vue';

/** 把粘贴的 mcpServers 配置解析成后端需要的 MCPClient 列表。 */
function parseMcpConfig(raw, keepAlive) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON 解析失败：${e.message}`);
  }
  const servers = parsed && parsed.mcpServers;
  if (!servers || typeof servers !== 'object') {
    throw new Error('配置缺少 mcpServers 字段。');
  }
  const entries = Object.entries(servers);
  if (entries.length === 0) {
    throw new Error('mcpServers 为空。');
  }
  return entries.map(([name, config]) => {
    let mcp_config;
    if ('url' in config) {
      mcp_config = {
        type: 'http_mcp',
        url: config.url,
        headers: config.headers ?? null,
        timeout: config.timeout ?? null,
      };
    } else {
      mcp_config = {
        type: 'stdio_mcp',
        command: config.command,
        args: config.args ?? null,
        env: config.env ?? null,
        cwd: config.cwd ?? null,
      };
    }
    return { name, is_stateful: keepAlive, mcp_config };
  });
}

export default defineComponent({
  name: 'AddMCPDialog',
  components: { Icon, Spinner, MCPConfigForm },
  props: {
    /** 当前工作区已有的 MCP 名称，不可再选。 */
    present: { type: Set, default: () => new Set() },
    /** 粘贴配置添加，入参为 MCPClient[]。 */
    onAdd: { type: Function, default: null },
    /** 从已安装库添加，入参为 mcpId[]。 */
    onAddFromLibrary: { type: Function, default: null },
  },
  setup(props) {
    const open = ref(false);
    const tab = ref('installed');
    const picked = ref(new Set());
    const busy = ref(false);
    const error = ref('');
    const configValue = ref('');
    const keepAlive = ref(true);

    const { mcps, loading } = useMCPs();
    const selectable = computed(() => mcps.value.filter((m) => !props.present.has(m.name)));

    function toggle(mcp) {
      if (props.present.has(mcp.name)) return;
      const next = new Set(picked.value);
      if (next.has(mcp.id)) next.delete(mcp.id);
      else next.add(mcp.id);
      picked.value = next;
    }

    function reset() {
      tab.value = 'installed';
      picked.value = new Set();
      busy.value = false;
      error.value = '';
      configValue.value = '';
      keepAlive.value = true;
    }

    async function addPicked() {
      if (!props.onAddFromLibrary) return;
      busy.value = true;
      error.value = '';
      try {
        await props.onAddFromLibrary([...picked.value]);
        open.value = false;
      } catch (e) {
        error.value = e?.message || String(e);
      } finally {
        busy.value = false;
      }
    }

    async function addFromConfig() {
      if (!props.onAdd) return;
      error.value = '';
      let clients;
      try {
        clients = parseMcpConfig(configValue.value, keepAlive.value);
      } catch (e) {
        error.value = e.message;
        return;
      }
      busy.value = true;
      try {
        await props.onAdd(clients);
        open.value = false;
      } catch (e) {
        // ApiError 已由客户端统一 toast，这里只补本地校验错误。
        if (e?.name !== 'ApiError') error.value = e?.message || String(e);
      } finally {
        busy.value = false;
      }
    }

    watch(open, (v) => {
      if (v) error.value = '';
    });

    return {
      open,
      tab,
      picked,
      busy,
      error,
      configValue,
      keepAlive,
      mcps,
      loading,
      selectable,
      toggle,
      reset,
      addPicked,
      addFromConfig,
    };
  },
});
</script>
