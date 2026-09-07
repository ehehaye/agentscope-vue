<template>
  <div class="tw-mb-2 tw-w-full tw-space-y-3 tw-rounded-28px tw-bg-muted tw-px-5 tw-py-4 tw-ring-1 tw-ring-border">
    <div class="tw-text-sm tw-font-medium tw-text-secondary-foreground">{{ displayName }}</div>
    <div class="tw-max-h-200px tw-overflow-y-auto tw-rounded-sm tw-bg-background tw-px-3 tw-py-2 tw-text-xs">
      <component :is="renderer" v-if="renderer" :pair="{ call: toolCall }" />
      <pre v-else class="tw-whitespace-pre-wrap tw-break-all">{{ confirmBody }}</pre>
    </div>
    <div class="tw-space-y-1 tw-text-sm">
      <div class="tw-mb-1 tw-font-medium tw-text-secondary-foreground">{{ TEXT.confirmToolCall }}</div>

      <button
        type="button"
        class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-start tw-gap-2 tw-rounded tw-px-2 tw-py-1 tw-text-left"
        :class="selected === 'yes' ? 'tw-text-primary' : 'tw-text-muted-foreground'"
        :disabled="hasConfirmed"
        @mouseenter="selected = 'yes'"
        @click="handleConfirm(true)"
      >
        <Spinner v-if="hasConfirmed && selected === 'yes'" class="tw-h-4 tw-w-4" />
        <Icon v-else icon="lucide:chevron-right" class="tw-h-4 tw-w-4" :class="selected === 'yes' ? 'tw-visible' : 'tw-invisible'" />
        <span>1. {{ TEXT.yes }}</span>
        <span v-if="selected === 'yes'" class="tw-ml-auto tw-text-xs tw-text-muted-foreground">
          (<Kbd className="text-xs">Enter</Kbd> {{ TEXT.toConfirm }})
        </span>
      </button>

      <button
        v-if="hasSuggestedRules"
        type="button"
        class="tw-flex tw-w-full tw-cursor-pointer tw-items-start tw-justify-start tw-gap-2 tw-rounded tw-px-2 tw-py-1 tw-text-left"
        :class="selected === 'yes_with_rule' ? 'tw-text-primary' : 'tw-text-muted-foreground'"
        :disabled="hasConfirmed"
        @mouseenter="selected = 'yes_with_rule'"
        @click="handleConfirm(true, [toolCall.suggested_rules[0]])"
      >
        <Spinner v-if="hasConfirmed && selected === 'yes_with_rule'" class="tw-mt-0.5 tw-h-4 tw-w-4 tw-shrink-0" />
        <Icon v-else icon="lucide:chevron-right" class="tw-mt-0.5 tw-h-4 tw-w-4 tw-shrink-0" :class="selected === 'yes_with_rule' ? 'tw-visible' : 'tw-invisible'" />
        <span class="tw-min-w-0 tw-break-words">2. {{ yesWithRuleText }}</span>
        <span v-if="selected === 'yes_with_rule'" class="tw-ml-auto tw-shrink-0 tw-text-xs tw-text-muted-foreground">
          (<Kbd className="text-xs">Enter</Kbd> {{ TEXT.toConfirm }})
        </span>
      </button>

      <button
        type="button"
        class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-start tw-gap-2 tw-rounded tw-px-2 tw-py-1 tw-text-left"
        :class="selected === 'no' ? 'tw-text-primary' : 'tw-text-muted-foreground'"
        :disabled="hasConfirmed"
        @mouseenter="selected = 'no'"
        @click="handleConfirm(false)"
      >
        <Spinner v-if="hasConfirmed && selected === 'no'" class="tw-h-4 tw-w-4" />
        <Icon v-else icon="lucide:chevron-right" class="tw-h-4 tw-w-4" :class="selected === 'no' ? 'tw-visible' : 'tw-invisible'" />
        <span>{{ hasSuggestedRules ? '3' : '2' }}. {{ TEXT.no }}</span>
        <span v-if="selected === 'no'" class="tw-ml-auto tw-text-xs tw-text-muted-foreground">
          (<Kbd className="text-xs">Enter</Kbd> {{ TEXT.toConfirm }})
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import Kbd from '@/components/ui/Kbd.vue';
import { parseInput } from './tool-utils';
import { TEXT } from './text';
import { getRenderer } from './tool-renderers';

export default defineComponent({
  name: 'ConfirmCard',
  components: { Icon, Spinner, Kbd },
  props: {
    toolCall: { type: Object, required: true },
  },
  emits: ['confirm'],
  setup(props, { emit }) {
    const selected = ref('yes');
    const hasConfirmed = ref(false);

    const hasSuggestedRules = computed(() => !!props.toolCall.suggested_rules?.length);

    const displayName = computed(() => props.toolCall.name);

    const renderer = computed(() => {
      const name = props.toolCall.name;
      // Confirm body only makes sense for tools that visualise their input
      // (file path, command, etc.). For everything else fall back to JSON.
      if (name === 'Bash' || name === 'Read' || name === 'Write' || name === 'Edit') {
        return getRenderer(name);
      }
      return null;
    });

    const confirmBody = computed(() => {
      const input = props.toolCall.input || '{}';
      try {
        return JSON.stringify(parseInput(input), null, 2);
      } catch {
        return input;
      }
    });

    const yesWithRuleText = computed(() => {
      const rule = props.toolCall.suggested_rules?.[0];
      if (!rule) return '';
      return TEXT.yesWithRule(rule.tool_name, rule.rule_content);
    });

    async function handleConfirm(confirm, rules) {
      if (hasConfirmed.value) return;
      hasConfirmed.value = true;
      try {
        await emit('confirm', confirm, rules);
      } catch {
        hasConfirmed.value = false;
      }
    }

    function onKeyDown(e) {
      const options = hasSuggestedRules.value
        ? ['yes', 'yes_with_rule', 'no']
        : ['yes', 'no'];
      const idx = options.indexOf(selected.value);
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selected.value = options[(idx - 1 + options.length) % options.length];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selected.value = options[(idx + 1) % options.length];
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected.value === 'yes_with_rule') {
          handleConfirm(true, [props.toolCall.suggested_rules[0]]);
        } else {
          handleConfirm(selected.value === 'yes');
        }
      }
    }

    onMounted(() => window.addEventListener('keydown', onKeyDown));
    onUnmounted(() => window.removeEventListener('keydown', onKeyDown));

    return {
      selected,
      hasConfirmed,
      hasSuggestedRules,
      displayName,
      renderer,
      confirmBody,
      yesWithRuleText,
      handleConfirm,
      TEXT,
    };
  },
});
</script>
