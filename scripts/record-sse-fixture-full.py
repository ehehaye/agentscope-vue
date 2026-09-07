"""Record a full chat run including tool-call + HITL confirmation cycle.

When a REQUIRE_USER_CONFIRM event arrives, automatically replies with a
USER_CONFIRM_RESULT allowing the tool call, then keeps capturing until
REPLY_END. This produces a fixture covering the complete agent loop:
text / thinking / tool_call / user_confirm / tool_result / final text.
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

import httpx

BASE = "http://localhost:8000"
USER_ID = "fixture-recorder"
HEADERS = {"X-User-ID": USER_ID, "Content-Type": "application/json"}
AGENT_ID = "3b473d7d34374275b7ecb21785926a15"
SESSION_ID = "a6e741d34f584b00914c354da066d607"


async def run(message: str, out_path: Path, auto_confirm: bool) -> None:
    events: list[dict] = []
    seen_reply_end = False
    confirmed = False

    async with httpx.AsyncClient(timeout=None) as client:
        stream_url = f"{BASE}/sessions/{SESSION_ID}/stream"

        async def consume_stream() -> None:
            nonlocal seen_reply_end, confirmed
            async with client.stream(
                "GET", stream_url,
                params={"agent_id": AGENT_ID},
                headers={"X-User-ID": USER_ID},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:].strip()
                    if not payload:
                        continue
                    try:
                        evt = json.loads(payload)
                    except json.JSONDecodeError:
                        continue
                    events.append(evt)
                    etype = evt.get("type")
                    print(f"  [{etype}] {evt.get('id','')[:8]}", flush=True)

                    if etype == "REQUIRE_USER_CONFIRM" and auto_confirm and not confirmed:
                        confirmed = True
                        reply_id = evt["reply_id"]
                        tool_calls = evt.get("tool_calls", [])
                        confirm_body = {
                            "agent_id": AGENT_ID,
                            "session_id": SESSION_ID,
                            "input": {
                                "type": "USER_CONFIRM_RESULT",
                                "id": "fixture-confirm-" + evt["id"],
                                "created_at": evt["created_at"],
                                "reply_id": reply_id,
                                "confirm_results": [
                                    {
                                        "confirmed": True,
                                        "tool_call": tc,
                                        "rules": None,
                                    }
                                    for tc in tool_calls
                                ],
                            },
                        }
                        print(f"  >>> auto-confirming {len(tool_calls)} tool call(s)", flush=True)
                        r = await client.post(f"{BASE}/chat/", headers=HEADERS, json=confirm_body)
                        print(f"      confirm status={r.status_code}", flush=True)

                    if etype == "REPLY_END":
                        seen_reply_end = True
                        break

        consumer = asyncio.create_task(consume_stream())
        await asyncio.sleep(1.0)

        chat_body = {
            "agent_id": AGENT_ID,
            "session_id": SESSION_ID,
            "input": {
                "role": "user",
                "name": "user",
                "content": [{"type": "text", "text": message}],
            },
        }
        print(f">>> POST /chat/  message={message!r}", flush=True)
        trigger = await client.post(f"{BASE}/chat/", headers=HEADERS, json=chat_body)
        print(f"    trigger status={trigger.status_code}", flush=True)
        trigger.raise_for_status()

        try:
            await asyncio.wait_for(consumer, timeout=300.0)
        except asyncio.TimeoutError:
            print("!!! timed out waiting for REPLY_END", flush=True)
            consumer.cancel()

    print(f"\nCaptured {len(events)} events (reply_end={seen_reply_end})")
    out_path.write_text(json.dumps(events, ensure_ascii=False, indent=2))
    print(f"Wrote fixture -> {out_path}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--message", default="请使用浏览器工具访问 https://example.com 并告诉我页面标题。")
    ap.add_argument("--no-auto-confirm", action="store_true",
                    help="Stop at REQUIRE_USER_CONFIRM instead of auto-allowing.")
    ap.add_argument("--out", default=str(Path(__file__).with_name("sse-fixture-tool-full.json")))
    args = ap.parse_args()
    asyncio.run(run(args.message, Path(args.out), auto_confirm=not args.no_auto_confirm))


if __name__ == "__main__":
    sys.exit(main())
