<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-gap-3 tw-overflow-y-auto tw-text-sm">
    <span class="tw-text-sm tw-text-muted-foreground">当前会话的权限规则与工作目录。</span>

    <div class="tw-flex tw-flex-col tw-gap-1.5">
      <span class="tw-flex tw-items-center tw-gap-1.5 tw-text-xs tw-font-medium tw-text-muted-foreground">
        <Icon icon="lucide:folder-open" class="tw-h-3.5 tw-w-3.5" />
        工作目录
      </span>
      <template v-if="workingDirs.length === 0">
        <p class="tw-px-1 tw-py-2 tw-text-xs tw-text-muted-foreground">没有配置工作目录。</p>
      </template>
      <ul v-else class="tw-flex tw-flex-col tw-rounded-md tw-border">
        <li
          v-for="dir in workingDirs"
          :key="dir.path"
          class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-px-2 tw-py-1.5 tw-text-xs"
          :class="dir !== workingDirs[workingDirs.length - 1] ? 'tw-border-b' : ''"
        >
          <span class="tw-min-w-0 tw-flex-1 tw-truncate tw-font-mono tw-text-left" :title="dir.path">{{ dir.path }}</span>
          <span class="tw-shrink-0 tw-rounded tw-border tw-px-1.5 tw-py-0.5 tw-text-10px">{{ dir.source }}</span>
        </li>
      </ul>
    </div>

    <template v-if="hasRules">
      <div v-for="behavior in behaviors" :key="behavior.key" class="tw-flex tw-flex-col tw-gap-1.5">
        <span class="tw-flex tw-items-center tw-gap-1.5 tw-text-xs tw-font-medium tw-text-muted-foreground">
          <Icon :icon="behavior.icon" class="tw-h-3.5 tw-w-3.5" />
          {{ behavior.label }}
        </span>
        <template v-for="(rules, toolName) in behavior.ruleMap">
        <div
          v-if="rules.length > 0"
          :key="toolName"
          class="tw-rounded-md tw-border"
        >
          <div class="tw-flex tw-items-center tw-gap-2 tw-border-b tw-px-2 tw-py-1.5 tw-text-sm tw-font-medium">
            {{ toolName }}
            <span class="tw-ml-auto tw-rounded tw-bg-secondary tw-px-1.5 tw-py-0 tw-text-xs">{{ rules.length }}</span>
          </div>
          <ul class="tw-flex tw-flex-col">
            <li
              v-for="(rule, index) in rules"
              :key="`${rule.rule_content || '*'}_${index}`"
              class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-px-2 tw-py-1.5 tw-text-xs"
              :class="index !== rules.length - 1 ? 'tw-border-b' : ''"
            >
              <span
                v-if="rule.rule_content"
                class="tw-min-w-0 tw-flex-1 tw-truncate tw-font-mono tw-text-left"
                :title="rule.rule_content"
              >{{ rule.rule_content }}</span>
              <span v-else class="tw-min-w-0 tw-flex-1 tw-text-muted-foreground">任意调用</span>
              <span class="tw-shrink-0 tw-rounded tw-border tw-px-1.5 tw-py-0.5 tw-text-10px">{{ rule.source }}</span>
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
