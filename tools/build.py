# SV모든것/index.html 을 GitHub Pages 에 올릴 사이트로 바꾼다. 원본은 고치지 않는다.
#   - HTML 안에 글자로 박힌 이미지를 site/assets/img 의 파일로 뺀다(한 번 받으면 캐시된다).
#     소리 3개는 스크립트가 박힌 글자를 직접 풀어 쓰므로 그대로 둔다.
#   - 공유 미리보기(og:image, og:url), 대표 주소, 검색엔진용 파일, 없는 주소 안내(404)를 붙인다.
# 실행: python -I -X utf8 tools/build.py   (사이트 내용을 고칠 때는 SV모든것/index.html 을 고친 뒤 다시 실행)
import base64
import hashlib
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.dirname(ROOT), 'index.html')
OUT = os.path.join(ROOT, 'site')
IMG = os.path.join(OUT, 'assets', 'img')
SITE = 'https://sovis-team.github.io/'
EXT = {'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif'}
ROUTES = ['about', 'android', 'windows', 'tech', 'research', 'news']

html = open(SRC, encoding='utf8').read()

shutil.rmtree(IMG, ignore_errors=True)
os.makedirs(IMG)
saved = {}


def extract(m):
    kind, data = m.group(1), m.group(2)
    if kind not in EXT:
        return m.group(0)
    raw = base64.b64decode(data)
    name = hashlib.sha1(raw).hexdigest()[:12] + '.' + EXT[kind]
    if name not in saved:
        open(os.path.join(IMG, name), 'wb').write(raw)
        saved[name] = len(raw)
    return 'assets/img/' + name


html = re.sub(r'data:(image/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)', extract, html)

meta = f'''<link rel="canonical" href="{SITE}">
<meta property="og:url" content="{SITE}">
<meta property="og:image" content="{SITE}assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Organization","name":"SOVIS","url":"{SITE}","sameAs":["https://github.com/SOVIS-Team"],"description":"소리의 방향·세기·종류를 화면 위에 그려 보여 주는 SoundVisualizer를 만드는 팀"}}</script>
'''
anchor = re.search(r'<meta name="description"[^>]*>\n?', html)
if not anchor:
    raise SystemExit('description 메타가 없습니다')
html = html[:anchor.end()] + meta + html[anchor.end():]

open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8', newline='').write(html)

# 없는 주소: /android 처럼 해시 없이 들어오면 그 화면으로, 나머지는 홈으로 보낸다.
routes = ','.join(f"'{r}'" for r in ROUTES)
open(os.path.join(OUT, '404.html'), 'w', encoding='utf8').write(f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>SOVIS</title>
<script>
(function () {{
  var first = location.pathname.replace(/^\\/+|\\/+$/g, '').split('/')[0].toLowerCase();
  location.replace('/' + ([{routes}].indexOf(first) >= 0 ? '#/' + first : ''));
}})();
</script>
</head>
<body>
<p><a href="/">SOVIS 홈으로 가기</a></p>
</body>
</html>
''')
open(os.path.join(OUT, 'robots.txt'), 'w', encoding='utf8').write(f'User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n')
open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf8').write(
    f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>{SITE}</loc></url>\n</urlset>\n')
open(os.path.join(OUT, '.nojekyll'), 'w').close()

print(f'index.html {len(html) / 1024:.0f} KB, 이미지 {len(saved)}개 {sum(saved.values()) / 1024:.0f} KB → site/')
if not os.path.exists(os.path.join(OUT, 'assets', 'og.jpg')):
    print('주의: site/assets/og.jpg(공유 미리보기 그림)가 없습니다')
