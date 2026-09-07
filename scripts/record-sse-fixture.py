"""Record a real AgentEvent SSE stream from the running backend.

Usage:
    python record-sse-fixture.py [--message "hello"] [--out fixture.json]

Captures all SSE events for one chat run and writes them as a JSON array
to --out (default: sse-fixture.json next to this script).
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
SESSION_ID = "1dfa9fb4a8f147249115a0067bd2b578"


async def run(message: str, out_path: Path) -> None:
    events: list[dict] = []
    seen_reply_end = False

    async with httpx.AsyncClient(timeout=None) as client:
        # 1) Open the SSE stream first (long-lived).
        stream_url = f"{BASE}/sessions/{SESSION_ID}/stream"
        stream_params = {"agent_id": AGENT_ID}

        async def consume_stream() -> None:
            nonlocal seen_reply_end
            async with client.stream(
                "GET", stream_url, params=stream_params, headers={"X-User-ID": USER_ID}
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
                    if etype == "REPLY_END":
                        seen_reply_end = True
                        break

        consumer = asyncio.create_task(consume_stream())

        # Give the stream a moment to connect, then trigger the chat run.
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
        trigger = await client.post(
            f"{BASE}/chat/", headers=HEADERS, json=chat_body
        )
        print(f"    trigger status={trigger.status_code} body={trigger.text[:200]}", flush=True)
        trigger.raise_for_status()

        # Wait for REPLY_END or a safety timeout.
        try:
            await asyncio.wait_for(consumer, timeout=120.0)
        except asyncio.TimeoutError:
            print("!!! timed out waiting for REPLY_END", flush=True)
            consumer.cancel()

    print(f"\nCaptured {len(events)} events (reply_end={seen_reply_end})")
    out_path.write_text(json.dumps(events, ensure_ascii=False, indent=2))
    print(f"Wrote fixture -> {out_path}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--message", default="你好，请用一句话介绍你自己。")
    ap.add_argument(
        "--out",
        default=str(Path(__file__).with_name("sse-fixture.json")),
    )
    args = ap.parse_args()
    asyncio.run(run(args.message, Path(args.out)))


if __name__ == "__main__":
    sys.exit(main())
