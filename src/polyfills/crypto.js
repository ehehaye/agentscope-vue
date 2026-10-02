// crypto.randomUUID 仅在安全上下文（HTTPS / localhost）可用，缺失时依赖内部调用会直接抛错。
// 如 @agentscope-ai/agentscope 的 dist/message/index.mjs 生成消息/内容块 id 时直接调用，必须 polyfill。
// 不能用 uuid@14 的 v4 兜底：它会优先回调 crypto.randomUUID，造成无限递归（栈溢出）。
// getRandomValues 在 HTTP 下同样可用，这里自行实现 v4 UUID。
const cryptoObj = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;

const HEX = '0123456789abcdef';

function randomUUID() {
  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    // 极老环境兜底：Math.random 强度较低，仅保证可用性
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  let s = '';
  for (let i = 0; i < 16; i++) {
    s += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
    if (i === 3 || i === 5 || i === 7 || i === 9) s += '-';
  }
  return s;
}

if (!cryptoObj) {
  globalThis.crypto = { randomUUID };
} else if (typeof cryptoObj.randomUUID !== 'function') {
  cryptoObj.randomUUID = randomUUID;
}
