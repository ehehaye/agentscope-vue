import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Vue from 'vue';
import Vuex from 'vuex';
import chatModule from '../src/store/modules/chat.js';

Vue.use(Vuex);

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, '../src/fixtures/sse');
const fixtures = {
  textReply: JSON.parse(readFileSync(join(fixtureDir, 'text-reply.json'), 'utf8')),
  thinkingTextReply: JSON.parse(readFileSync(join(fixtureDir, 'thinking-text-reply.json'), 'utf8')),
  toolCallHitlPending: JSON.parse(readFileSync(join(fixtureDir, 'tool-call-hitl-pending.json'), 'utf8')),
  toolCallFullCycle: JSON.parse(readFileSync(join(fixtureDir, 'tool-call-full-cycle.json'), 'utf8')),
};

const store = new Vuex.Store({ modules: { chat: chatModule } });

const expectations = {
  textReply: { phase: 'idle', hasAssistant: true },
  thinkingTextReply: { phase: 'idle', hasAssistant: true },
  toolCallHitlPending: { phase: 'streaming', hasHitl: true },
  toolCallFullCycle: { phase: 'idle', hasAssistant: true },
};

let failed = false;
for (const [name, events] of Object.entries(fixtures)) {
  store.commit('chat/RESET');
  store.commit('chat/SET_KEY', 'dev-agent:dev-session');
  try {
    for (const event of events) {
      await store.dispatch('chat/processEvent', { event });
    }
  } catch (e) {
    console.error(`❌ ${name}: processEvent 抛出`, e);
    failed = true;
    continue;
  }
  const state = store.state.chat;
  const exp = expectations[name];
  const ok = state.phase === exp.phase &&
    (!exp.hasAssistant || state.messages.some((m) => m.role === 'assistant')) &&
    (!exp.hasHitl || state.messages.some((m) => m.content.some((b) => b.type === 'tool_call' && b.state === 'asking')));
  if (ok) {
    console.log(`✅ ${name}: phase=${state.phase}, messages=${state.messages.length}`);
  } else {
    console.error(`❌ ${name}: 状态不符`, { phase: state.phase, messages: state.messages.length });
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
