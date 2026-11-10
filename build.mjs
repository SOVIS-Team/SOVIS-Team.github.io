// 의존성 없는 정적 사이트 빌드. src/pages 의 페이지를 공통 틀에 끼워 dist/ 를 만든다.
// 모든 내부 주소를 상대 경로로 써서 github.io 하위 경로와 자체 도메인 어디에 올려도 그대로 동작한다.
// 실행: node build.mjs   (배포할 때는 SITE_URL=https://주소/ 를 넘긴다)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'dist');
const SITE = (process.env.SITE_URL || 'https://sovis-team.github.io/').replace(/\/?$/, '/');
const BASE = new URL(SITE).pathname;

const read = (p) => readFileSync(join(SRC, p), 'utf8');
const hash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 8);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });
for (const dir of readdirSync(join(ROOT, 'public'))) {
  const from = join(ROOT, 'public', dir);
  cpSync(from, join(OUT, dir), { recursive: statSync(from).isDirectory() });
}

// CSS와 스크립트는 내용 해시를 붙여 새 배포가 곧바로 반영되게 한다.
const css = read('css/site.css');
const cssName = `site.${hash(css)}.css`;
writeFileSync(join(OUT, 'assets', cssName), css);
const scripts = {};
for (const file of readdirSync(join(SRC, 'js'))) {
  const text = read(`js/${file}`);
  const name = `${file.replace(/\.js$/, '')}.${hash(text)}.js`;
  writeFileSync(join(OUT, 'assets', name), text);
  scripts[file.replace(/\.js$/, '')] = name;
}

const head = read('partials/head.html');
const bar = read('partials/bar.html');
const footer = read('partials/footer.html');
const compare = read('partials/compare.html');
const pages = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
const urls = [];

for (const file of pages) {
  const raw = read(`pages/${file}`);
  const match = raw.match(/^<!--(\{[\s\S]*?\})-->\n?/);
  if (!match) throw new Error(`${file}: 첫 줄에 페이지 정보가 없습니다`);
  const meta = JSON.parse(match[1]);
  const body = raw.slice(match[0].length).replaceAll('{{compare}}', compare);
  const path = meta.path;
  const is404 = file === '404.html';
  // 404 는 어느 깊이의 주소에서든 보이므로 사이트 기준 절대 경로를 쓴다.
  const depth = path ? path.split('/').filter(Boolean).length : 0;
  const root = is404 ? BASE : '../'.repeat(depth);
  const list = [...(meta.js || []), 'site'];
  const tags = list.map((s) => {
    if (!scripts[s]) throw new Error(`${file}: 스크립트 ${s} 없음`);
    return `<script src="{{root}}assets/${scripts[s]}" defer></script>`;
  }).join('\n');
  const url = new URL(path, SITE).href;
  const fill = (text) => text
    .replaceAll('{{title}}', meta.title)
    .replaceAll('{{desc}}', meta.desc)
    .replaceAll('{{url}}', url)
    .replaceAll('{{site}}', SITE)
    .replaceAll('{{css}}', cssName)
    .replaceAll('{{scripts}}', tags)
    .replaceAll('{{root}}', root)
    .replace(/\{\{active:(\w+)\}\}/g, (_, key) => (key === meta.nav ? 'aria-current="page"' : ''));
  const page = fill(`<!doctype html>\n<html lang="ko">\n${head}<body>\n${bar}<main id="main">\n${body}</main>\n${footer}</body>\n</html>\n`);
  const target = is404 ? join(OUT, '404.html') : join(OUT, path, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, page);
  if (!is404) urls.push(url);
}

writeFileSync(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', SITE).href}\n`);
writeFileSync(join(OUT, '.nojekyll'), '');

const total = (dir) => readdirSync(dir).reduce((sum, f) => {
  const p = join(dir, f);
  return sum + (statSync(p).isDirectory() ? total(p) : statSync(p).size);
}, 0);
console.log(`${pages.length}쪽, ${(total(OUT) / 1048576).toFixed(1)} MB → dist/`, existsSync(join(OUT, 'index.html')) ? '' : '(첫 화면 없음)');
