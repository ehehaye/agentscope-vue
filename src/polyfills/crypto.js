// webpack 4 不支持 uuid@14 的 exports 字段（包无 main），深路径直接引浏览器构建
import uuidv4 from 'uuid/dist/v4.js';

// crypto.randomUUID 仅在安全上下文（HTTPS / localhost）且较新的浏览器中可用，
// 缺失时会导致依赖（如 @agentscope-ai/agentscope）内部调用直接抛错。
// 这里用 uuid v4 兜底补齐，保证所有依赖的调用均可用
const cryptoObj = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
if (!cryptoObj || typeof cryptoObj.randomUUID !== 'function') {
  if (cryptoObj) {
    cryptoObj.randomUUID = uuidv4;
  } else {
    globalThis.crypto = { randomUUID: uuidv4 };
  }
}
