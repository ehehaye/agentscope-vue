import { ref, watch } from '@/composables/vue';
import { AppStorageKeys } from '@/constants/app-state';

const MAX_PANELS_PER_COLUMN = 2;

export const PANEL_MENU = [
  { key: 'plan', label: '任务', icon: 'lucide:list-todo' },
  { key: 'mcp', label: 'MCP', icon: 'lucide:plug' },
  { key: 'skill', label: '技能', icon: 'lucide:book-text' },
  { key: 'permission', label: '权限', icon: 'lucide:shield-check' },
  { key: 'knowledge', label: '知识库', icon: 'lucide:database' },
  { key: 'team', label: '团队', icon: 'lucide:users-round' },
];

const KNOWN_PANELS = new Set(PANEL_MENU.map((i) => i.key));

function loadLayout() {
  try {
    const raw = JSON.parse(localStorage.getItem(AppStorageKeys.CHAT_PANEL_LAYOUT) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map((column) => (Array.isArray(column) ? column.filter((k) => KNOWN_PANELS.has(k)) : []))
      .filter((column) => column.length > 0);
  } catch {
    return [];
  }
}

function saveLayout(layout) {
  try {
    localStorage.setItem(AppStorageKeys.CHAT_PANEL_LAYOUT, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

function openPanelInLayout(layout, key) {
  if (layout.some((column) => column.includes(key))) return layout;
  const idx = layout.findIndex((column) => column.length < MAX_PANELS_PER_COLUMN);
  if (idx === -1) return [...layout, [key]];
  return layout.map((column, i) => (i === idx ? [...column, key] : column));
}

function closePanelInLayout(layout, key) {
  return layout.map((column) => column.filter((k) => k !== key)).filter((column) => column.length > 0);
}

/**
 * 右侧面板停靠布局：持久化到 localStorage，提供开关与自动放置。
 */
export function usePanelLayout() {
  const panelLayout = ref(loadLayout());
  watch(panelLayout, saveLayout, { deep: true });

  function isPanelOpen(key) {
    return panelLayout.value.some((column) => column.includes(key));
  }

  function togglePanel(key) {
    panelLayout.value = isPanelOpen(key)
      ? closePanelInLayout(panelLayout.value, key)
      : openPanelInLayout(panelLayout.value, key);
  }

  function closePanel(key) {
    panelLayout.value = closePanelInLayout(panelLayout.value, key);
  }

  return { panelLayout, isPanelOpen, togglePanel, closePanel, openPanelInLayout };
}
