// 各 polyfill 按职能独立成文件，在此统一引入；
// 本模块是 main.js 的首个 import，保证所有补丁先于业务与依赖代码执行
import './abort-signal';
import './crypto';
