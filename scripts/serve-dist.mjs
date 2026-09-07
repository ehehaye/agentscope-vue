// 静态预览 dist 产物：vue-cli-service serve 无法直接托管 build 输出，
// 本脚本用 Node 内置 http 模块轻量托管，无需额外依赖。
// 用法：pnpm build && pnpm preview（默认 http://localhost:4173，可用 PORT 覆盖）。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.map': 'application/json',
};

createServer(async (req, res) => {
	let pathname;
	try {
		pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
	} catch {
		res.writeHead(400).end('Bad Request');
		return;
	}
	let filePath = normalize(join(ROOT, pathname));
	// 防目录穿越
	if (filePath !== ROOT && !filePath.startsWith(ROOT + '/')) {
		res.writeHead(403).end('Forbidden');
		return;
	}
	try {
		const body = await readFile(filePath);
		const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
		res.writeHead(200, { 'Content-Type': type });
		res.end(body);
	} catch {
		// 应用为 hash 路由，任何未命中路径统一回退 index.html
		try {
			const body = await readFile(join(ROOT, 'index.html'));
			res.writeHead(200, { 'Content-Type': MIME['.html'] });
			res.end(body);
		} catch {
			res.writeHead(500).end('dist/index.html 不存在，请先运行 pnpm build');
		}
	}
}).listen(PORT, () => {
	console.log(`Preview server: http://localhost:${PORT}/ (serving ${ROOT})`);
});
