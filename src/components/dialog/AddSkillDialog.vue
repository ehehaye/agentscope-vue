<template>
  <span class="tw-block">
    <el-button type="primary" size="small" class="tw-w-full" @click="open = true">
      <slot>
        <Icon icon="lucide:plus-circle" class="tw-h-4 tw-w-4" />
        添加技能
      </slot>
    </el-button>

    <el-dialog
      title="添加技能"
      :visible.sync="open"
      width="640px"
      :close-on-click-modal="false"
      append-to-body
      @closed="reset"
    >
      <p class="tw-mb-3 tw-text-sm tw-text-muted-foreground">从已安装的技能中选择，或上传一个技能文件夹。</p>

      <el-tabs v-model="tab">
        <el-tab-pane label="从已安装中选择" name="installed">
          <div class="tw-max-h-80 tw-overflow-y-auto">
            <div v-if="loading" class="tw-flex tw-justify-center tw-py-10">
              <Spinner class="tw-h-6 tw-w-6" />
            </div>
            <div v-else-if="skills.length === 0" class="tw-py-10 tw-text-center tw-text-sm tw-text-muted-foreground">
              还没有已安装的技能，请先到「技能中心」安装。
            </div>
            <div v-else class="tw-space-y-1">
              <label
                v-for="skill in skills"
                :key="skill.id"
                class="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-2 tw-transition-colors"
                :class="present.has(skill.name) ? 'tw-cursor-not-allowed tw-opacity-60' : 'tw-cursor-pointer hover:tw-bg-muted'"
              >
                <el-checkbox
                  :value="present.has(skill.name) || picked.has(skill.id)"
                  :disabled="present.has(skill.name)"
                  @change="() => toggle(skill)"
                />
                <img v-if="skill.icon_url" :src="skill.icon_url" class="tw-h-8 tw-w-8 tw-rounded-md tw-object-cover" />
                <div
                  v-else
                  class="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-xs tw-font-bold"
                >
                  {{ (skill.display_name || skill.name).slice(0, 1).toUpperCase() }}
                </div>
                <div class="tw-min-w-0 tw-flex-1">
                  <div class="tw-flex tw-items-center tw-gap-2">
                    <span class="tw-font-medium">{{ skill.display_name || skill.name }}</span>
                    <span v-if="skill.author" class="tw-text-xs tw-text-muted-foreground">@{{ skill.author }}</span>
                  </div>
                  <p class="tw-line-clamp-1 tw-text-xs tw-text-muted-foreground">{{ skill.description }}</p>
                </div>
              </label>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="上传文件夹" name="upload">
          <div class="tw-max-h-80 tw-overflow-y-auto">
            <input
              ref="fileInput"
              type="file"
              class="tw-hidden"
              webkitdirectory
              directory
              multiple
              @change="onPick"
            />
            <div v-if="files.length === 0" class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-py-10 tw-text-center">
              <Icon icon="lucide:folder-up" class="tw-h-8 tw-w-8 tw-text-muted-foreground" />
              <div class="tw-text-sm tw-font-medium">选择一个技能文件夹</div>
              <p class="tw-text-xs tw-text-muted-foreground">文件夹需包含 SKILL.md。</p>
              <el-button size="small" @click="pickFolder">
                <Icon icon="lucide:folder-up" class="tw-h-4 tw-w-4" />
                选择文件夹
              </el-button>
            </div>
            <div v-else>
              <div class="tw-mb-2 tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-bg-muted tw-p-2">
                <Icon icon="lucide:folder-up" class="tw-h-5 tw-w-5 tw-shrink-0" />
                <div class="tw-min-w-0 tw-flex-1">
                  <div class="tw-truncate tw-text-sm tw-font-medium">{{ root }}</div>
                  <div class="tw-text-xs tw-text-muted-foreground">共 {{ files.length }} 个文件</div>
                </div>
                <el-button size="mini" :disabled="busy" @click="pickFolder">重新选择</el-button>
              </div>
              <div class="tw-space-y-1">
                <div
                  v-for="file in files"
                  :key="file.webkitRelativePath"
                  class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-px-2 tw-py-1"
                >
                  <span class="tw-truncate tw-font-mono tw-text-xs">{{ file.webkitRelativePath }}</span>
                  <span class="tw-shrink-0 tw-text-xs tw-text-muted-foreground">{{ formatBytes(file.size) }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-progress v-if="progress !== null" :percentage="progress" :show-text="false" class="tw-mt-3" />

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
        <el-button v-else size="small" type="primary" :loading="busy" :disabled="files.length === 0" @click="upload">
          添加
        </el-button>
      </span>
    </el-dialog>
  </span>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@/components/iconify/index';
import Spinner from '@/components/ui/Spinner.vue';
import { useSkills } from '@/composables/useSkills';

/** 以可读性最好的单位渲染字节数。 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default defineComponent({
  name: 'AddSkillDialog',
  components: { Icon, Spinner },
  props: {
    /** 当前工作区已有的技能名称，不可再选。 */
    present: { type: Set, default: () => new Set() },
    /** 上传文件夹，入参为 File[] 与 { onProgress }。 */
    onUpload: { type: Function, default: null },
    /** 从已安装库添加，入参为 skillId[]。 */
    onAddFromLibrary: { type: Function, default: null },
  },
  setup(props) {
    const open = ref(false);
    const tab = ref('installed');
    const picked = ref(new Set());
    const files = ref([]);
    const progress = ref(null);
    const busy = ref(false);
    const error = ref('');
    const fileInput = ref(null);

    const { skills, loading } = useSkills();
    const selectable = computed(() => skills.value.filter((s) => !props.present.has(s.name)));
    const root = computed(() => files.value[0]?.webkitRelativePath.split('/')[0] || '');

    function toggle(skill) {
      if (props.present.has(skill.name)) return;
      const next = new Set(picked.value);
      if (next.has(skill.id)) next.delete(skill.id);
      else next.add(skill.id);
      picked.value = next;
    }

    function pickFolder() {
      fileInput.value?.click();
    }

    function onPick(e) {
      files.value = Array.from(e.target.files || []);
      error.value = '';
    }

    function reset() {
      tab.value = 'installed';
      picked.value = new Set();
      files.value = [];
      progress.value = null;
      busy.value = false;
      error.value = '';
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

    async function upload() {
      if (!props.onUpload) return;
      busy.value = true;
      error.value = '';
      progress.value = 0;
      try {
        await props.onUpload(files.value, {
          onProgress: ({ loaded, total }) => {
            progress.value = total ? Math.round((loaded / total) * 100) : 0;
          },
        });
        open.value = false;
      } catch (e) {
        error.value = e?.message || String(e);
        progress.value = null;
      } finally {
        busy.value = false;
      }
    }

    return {
      open,
      tab,
      picked,
      files,
      progress,
      busy,
      error,
      fileInput,
      skills,
      loading,
      selectable,
      root,
      toggle,
      pickFolder,
      onPick,
      reset,
      addPicked,
      upload,
      formatBytes,
    };
  },
});
</script>
