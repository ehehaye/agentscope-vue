/**
 * SSE AgentEvent fixtures for chat-link replay testing.
 *
 * Each file is a JSON array of raw ``AgentEvent`` objects captured from a
 * real backend run (see ``scripts/record-sse-fixture*.py``). Import them
 * directly in composable/unit tests to drive the Vue chat state machine
 * without a live backend.
 *
 * Coverage:
 *   - text-reply            : plain text reply (no thinking, no tools)
 *   - thinking-text-reply   : thinking block + text reply
 *   - tool-call-hitl-pending: thinking + tool_call, ends at REQUIRE_USER_CONFIRM
 *   - tool-call-full-cycle  : thinking + tool_call + HITL confirm + tool_result + final text
 */
export { default as textReply } from './text-reply.json';
export { default as thinkingTextReply } from './thinking-text-reply.json';
export { default as toolCallHitlPending } from './tool-call-hitl-pending.json';
export { default as toolCallFullCycle } from './tool-call-full-cycle.json';
