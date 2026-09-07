<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto text-sm">
    <span class="text-sm text-muted-foreground">当前会话的权限规则与工作目录。</span>

    <div class="flex flex-col gap-1.5">
      <span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon icon="lucide:folder-open" class="h-3.5 w-3.5" />
        工作目录
      </span>
      <template v-if="workingDirs.length === 0">
        <p class="px-1 py-2 text-xs text-muted-foreground">没有配置工作目录。</p>
      </template>
      <ul v-else class="flex flex-col rounded-md border">
        <li
          v-for="dir in workingDirs"
          :key="dir.path"
          class="flex items-center justify-between gap-2 px-2 py-1.5 text-xs"
          :class="dir !== workingDirs[workingDirs.length - 1] ? 'border-b' : ''"
        >
          <span class="min-w-0 flex-1 truncate font-mono text-left" :title="dir.path">{{ dir.path }}</span>
          <span class="shrink-0 rounded border px-1.5 py-0.5 tw-text-10px">{{ dir.source }}</span>
        </li>
      </ul>
    </div>

    <template v-if="hasRules">
      <div v-for="behavior in behaviors" :key="behavior.key" class="flex flex-col gap-1.5">
        <span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon :icon="behavior.icon" class="h-3.5 w-3.5" />
          {{ behavior.label }}
        </span>
        <template v-for="(rules, toolName) in behavior.ruleMap">
        <div
          v-if="rules.length > 0"
          :key="toolName"
          class="rounded-md border"
        >
          <div class="flex items-center gap-2 border-b px-2 py-1.5 text-sm font-medium">
            {{ toolName }}
            <span class="ml-auto rounded bg-secondary px-1.5 py-0 text-xs">{{ rules.length }}</span>
          </div>
          <ul class="flex flex-col">
            <li
              v-for="(rule, index) in rules"
              :key="`${rule.rule_content || '*'}_${index}`"
              class="flex items-center justify-between gap-2 px-2 py-1.5 text-xs"
              :class="index !== rules.length - 1 ? 'border-b' : ''"
            >
              <span
                v-if="rule.rule_content"
                class="min-w-0 flex-1 truncate font-mono text-left"
                :title="rule.rule_content"
              >{{ rule.rule_content }}</span>
              <span v-else class="min-w-0 flex-1 text-muted-foreground">任意调用</span>
              <span class="shrink-0 rounded border px-1.5 py-0.5 tw-text-10px">{{ rule.source }}</span>
            </li>
          </ul>
        </div>
        </template>
      </div>
    </template>
    <template v-else>
      <PanelEmpty icon="lucide:shield-x" title="暂无权限规则" description="当前会话未配置任何权限规则。" />
    </template>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import PanelEmpty from './PanelEmpty.vue';

const BEHAVIOR_META = {
  allow: { label: '允许', icon: 'lucide:shield-check' },
  deny: { label: '拒绝', icon: 'lucide:ban' },
  ask: { label: '询问', icon: 'lucide:circle-help' },
};

export default defineComponent({
  name: 'PermissionPanel',
  components: { Icon, PanelEmpty },
  props: {
    permissionContext: { type: Object, default: null },
  },
  setup(props) {
    const workingDirs = computed(() =>
      Object.values(props.permissionContext?.working_directories ?? {}),
    );
    const hasRules = computed(() =>
      Object.keys(props.permissionContext?.allow_rules ?? {}).length > 0 ||
      Object.keys(props.permissionContext?.deny_rules ?? {}).length > 0 ||
      Object.keys(props.permissionContext?.ask_rules ?? {}).length > 0,
    );

    const behaviors = computed(() =>
      Object.entries(BEHAVIOR_META)
        .map(([key, meta]) => ({
          key,
          ...meta,
          ruleMap: props.permissionContext?.[`${key}_rules`] ?? {},
        }))
        .filter((b) => Object.values(b.ruleMap).some((rules) => rules.length > 0)),
    );

    return {
      workingDirs,
      hasRules,
      behaviors,
    };
  },
});
</script>
