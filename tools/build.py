# SV모든것/index.html(한국어)과 SV모든것/index_en.html(영어)을 GitHub Pages 에 올릴 사이트로 바꾼다. 원본은 고치지 않는다.
#   - 한국어는 site/index.html, 영어는 site/en/index.html 로 쓴다.
#   - HTML 안에 글자로 박힌 이미지를 site/assets/img 의 파일로 뺀다(두 언어가 같은 파일을 쓴다. 한 번 받으면 캐시된다).
#     /en/ 에서도 열리도록 /assets/img/... 처럼 사이트 맨 위 기준 주소로 쓴다.
#     소리 3개는 스크립트가 박힌 글자를 직접 풀어 쓰므로 그대로 둔다.
#   - 원본끼리 서로 가리키는 주소(index_en.html, index.html)를 사이트 주소(/en/, /)로 바꾼다.
#   - 언어마다 공유 미리보기(og:url, og:image), 대표 주소, 언어별 주소(hreflang), 검색엔진용 파일,
#     없는 주소 안내(404)를 붙인다.
# 실행: python -I -X utf8 tools/build.py   (사이트 내용을 고칠 때는 두 원본을 함께 고친 뒤 다시 실행)
import base64
import hashlib
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, 'site')
IMG = os.path.join(OUT, 'assets', 'img')
SITE = 'https://sovis-team.github.io/'
EXT = {'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif'}
ROUTES = ['about', 'android', 'windows', 'tech', 'research', 'news']

# 원본 파일, 사이트에서의 경로, 원본이 다른 언어를 가리키는 주소와 그 사이트 주소
PAGES = {
    'ko': {'src': 'index.html', 'path': '', 'locale': 'ko_KR', 'other': ('index_en.html', '/en/'), 'og': 'og.jpg',
           'about': '소리의 방향·세기·종류를 화면 위에 그려 보여 주는 SoundVisualizer를 만드는 팀'},
    # 공유 미리보기 그림(site/assets 에 커밋한 파일). og_en.jpg 는 og.jpg 와 같은 사진·짜임에 영어 문구를 얹은 것이다.
    'en': {'src': 'index_en.html', 'path': 'en/', 'locale': 'en_US', 'other': ('index.html', '/'), 'og': 'og_en.jpg',
           'about': 'The team behind SoundVisualizer, which draws the direction, loudness and type of sounds on the screen'},
}
LINKS_TO_OTHER = 3  # 머리 스크립트 1, 머리글 링크 1, 모바일 메뉴 링크 1

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
    return '/assets/img/' + name


def alternates():
    return (f'<link rel="alternate" hreflang="ko" href="{SITE}">\n'
            f'<link rel="alternate" hreflang="en" href="{SITE}en/">\n'
            f'<link rel="alternate" hreflang="x-default" href="{SITE}en/">\n')


sizes = {}
for lang, p in PAGES.items():
    html = open(os.path.join(SRC_DIR, p['src']), encoding='utf8').read()
    if f'<html lang="{lang}">' not in html:
        raise SystemExit(f'{p["src"]}: <html lang="{lang}"> 가 없습니다')

    html = re.sub(r'data:(image/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)', extract, html)

    src_link, site_link = p['other']
    n = html.count(f'"{src_link}"')
    if n != LINKS_TO_OTHER:
        raise SystemExit(f'{p["src"]}: "{src_link}" 가 {n}번 있습니다({LINKS_TO_OTHER}번이어야 합니다)')
    html = html.replace(f'"{src_link}"', f'"{site_link}"')

    url = SITE + p['path']
    other_locale = PAGES['en' if lang == 'ko' else 'ko']['locale']
    meta = (f'<link rel="canonical" href="{url}">\n'
            + alternates()
            + f'<meta property="og:url" content="{url}">\n'
            f'<meta property="og:locale:alternate" content="{other_locale}">\n'
            f'<meta property="og:image" content="{SITE}assets/{p["og"]}">\n'
            '<meta property="og:image:width" content="1200">\n'
            '<meta property="og:image:height" content="630">\n'
            '<meta name="twitter:card" content="summary_large_image">\n'
            f'<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Organization","name":"SOVIS","url":"{url}",'
            f'"sameAs":["https://github.com/SOVIS-Team"],"description":"{p["about"]}"}}</script>\n')
    anchor = re.search(r'<meta name="description"[^>]*>\n?', html)
    if not anchor:
        raise SystemExit(f'{p["src"]}: description 메타가 없습니다')
    html = html[:anchor.end()] + meta + html[anchor.end():]

    out_dir = os.path.join(OUT, p['path'])
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf8', newline='').write(html)
    sizes[lang] = len(html)

# 없는 주소: /android, /en/android 처럼 해시 없이 들어오면 그 언어의 그 화면으로, 나머지는 그 언어의 홈으로 보낸다.
routes = ','.join(f"'{r}'" for r in ROUTES)
open(os.path.join(OUT, '404.html'), 'w', encoding='utf8').write(f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>SOVIS</title>
<script>
(function () {{
  var parts = location.pathname.replace(/^\\/+|\\/+$/g, '').split('/');
  var base = '/';
  if (parts[0].toLowerCase() === 'en') {{ base = '/en/'; parts.shift(); }}
  var first = (parts[0] || '').toLowerCase();
  location.replace(base + ([{routes}].indexOf(first) >= 0 ? '#/' + first : ''));
}})();
</script>
</head>
<body>
<p><a href="/">SOVIS 홈으로 가기</a> · <a href="/en/" lang="en">Go to the SOVIS home page</a></p>
</body>
</html>
''')
open(os.path.join(OUT, 'robots.txt'), 'w', encoding='utf8').write(f'User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n')

links = ''.join(f'    <xhtml:link rel="alternate" hreflang="{h}" href="{u}"/>\n'
                for h, u in (('ko', SITE), ('en', SITE + 'en/'), ('x-default', SITE + 'en/')))
urls = ''.join(f'  <url>\n    <loc>{SITE + p["path"]}</loc>\n{links}  </url>\n' for p in PAGES.values())
open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf8').write(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + urls + '</urlset>\n')
open(os.path.join(OUT, '.nojekyll'), 'w').close()

print(f'index.html {sizes["ko"] / 1024:.0f} KB, en/index.html {sizes["en"] / 1024:.0f} KB, '
      f'이미지 {len(saved)}개 {sum(saved.values()) / 1024:.0f} KB → site/')
for p in PAGES.values():
    if not os.path.exists(os.path.join(OUT, 'assets', p['og'])):
        print(f'주의: site/assets/{p["og"]}(공유 미리보기 그림)가 없습니다')
