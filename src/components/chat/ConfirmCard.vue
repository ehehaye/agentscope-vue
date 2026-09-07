<template>
  <div class="mb-2 w-full space-y-3 rounded-[28px] bg-muted px-5 py-4 ring-1 ring-border">
    <div class="text-sm font-medium text-secondary-foreground">{{ displayName }}</div>
    <div class="max-h-[200px] overflow-y-auto rounded-sm bg-background px-3 py-2 text-xs">
      <component :is="renderer" v-if="renderer" :pair="{ call: toolCall }" />
      <pre v-else class="whitespace-pre-wrap break-all">{{ confirmBody }}</pre>
    </div>
    <div class="space-y-1 text-sm">
      <div class="mb-1 font-medium text-secondary-foreground">{{ TEXT.confirmToolCall }}</div>

      <button
        type="button"
        class="flex w-full cursor-pointer items-center justify-start gap-2 rounded px-2 py-1 text-left"
        :class="selected === 'yes' ? 'text-primary' : 'text-muted-foreground'"
        :disabled="hasConfirmed"
        @mouseenter="selected = 'yes'"
        @click="handleConfirm(true)"
      >
        <Spinner v-if="hasConfirmed && selected === 'yes'" class="h-4 w-4" />
        <Icon v-else icon="lucide:chevron-right" class="h-4 w-4" :class="selected === 'yes' ? 'visible' : 'invisible'" />
        <span>1. {{ TEXT.yes }}</span>
        <span v-if="selected === 'yes'" class="ml-auto text-xs text-muted-foreground">
          (<Kbd className="text-xs">Enter</Kbd> {{ TEXT.toConfirm }})
        </span>
      </button>

      <button
        v-if="hasSuggestedRules"
        type="button"
        class="flex w-full cursor-pointer items-start justify-start gap-2 rounded px-2 py-1 text-left"
        :class="selected === 'yes_with_rule' ? 'text-primary' : 'text-muted-foreground'"
        :disabled="hasConfirmed"
        @mouseenter="selected = 'yes_with_rule'"
        @click="handleConfirm(true, [toolCall.suggested_rules[0]])"
      >
        <Spinner v-if="hasConfirmed && selected === 'yes_with_rule'" class="mt-0.5 h-4 w-4 shrink-0" />
        <Icon v-else icon="lucide:chevron-right" class="mt-0.5 h-4 w-4 shrink-0" :class="selected === 'yes_with_rule' ? 'visible' : 'invisible'" />
        <span class="min-w-0 break-words">2. {{ yesWithRuleText }}</span>
        <span v-if="selected === 'yes_with_rule'" class="ml-auto shrink-0 text-xs text-muted-foreground">
          (<Kbd className="text-xs">Enter</Kbd> {{ TEXT.toConfirm }})
        </span>
      </button>

      <button
        type="button"
        class="flex w-full cursor-pointer items-center justify-start gap-2 rounded px-2 py-1 text-left"
        :class="selected === 'no' ? 'text-primary' : 'text-muted-foreground'"
        :disabled="hasConfirmed"
        @mouseenter="selected = 'no'"
        @click="handleConfirm(false)"
      >
        <Spinner v-if="hasConfirmed && selected === 'no'" class="h-4 w-4" />
        <Icon v-else icon="lucide:chevron-right" class="h-4 w-4" :class="selected === 'no' ? 'visible' : 'invisible'" />
        <span>{{ hasSuggestedRules ? '3' : '2' }}. {{ TEXT.no }}</span>
        <span v-if="selected === 'no'" class="ml-auto text-xs text-muted-foreground">
          (<Kbd className="text-xs">Enter</Kbd> {{ TEXT.toConfirm }})
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted } from '@vue/composition-api';
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
