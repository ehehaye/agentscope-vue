import { installAbortSignalPolyfill } from 'abort-signal-polyfill';

// 为不支持 AbortSignal.any / timeout / abort 的旧版浏览器补齐能力
installAbortSignalPolyfill();
