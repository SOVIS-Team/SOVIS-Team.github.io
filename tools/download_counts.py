# 사이트를 배포하기 전에 누적 다운로드 수를 HTML 에 미리 넣는다. tools/build.py 다음에 돌린다.
#   - 두 저장소의 모든 릴리스에서 .apk / .zip 파일의 download_count 를 더한다(mapping-*.txt 같은 부속 파일은 뺀다).
#     사이트의 받기 버튼은 릴리스 페이지로 이어지므로, 사이트를 거친 것과 릴리스에서 바로 받은 것이 모두 들어간다.
#   - site/index.html·site/en/index.html 의 data-dl 숫자를 채우고 data-dl-wrap 의 hidden 을 뗀다.
#     그래서 방문자의 브라우저가 GitHub API 에 닿지 못해도(회사망 차단, 시간당 60번 제한) 숫자가 보인다.
#     브라우저에 닿으면 페이지 스크립트가 GitHub API 로 더 새 값을 받아 바꾼다.
#   - GitHub 에서 숫자를 못 받으면 아무것도 바꾸지 않는다(그때는 페이지 스크립트만 숫자를 채운다).
# 실행: python -I -X utf8 tools/build.py && python -I -X utf8 tools/download_counts.py   (GITHUB_TOKEN 이 있으면 쓴다)
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
REPOS = {'android': 'SOVIS-Team/SoundVisualizer-Android', 'windows': 'SOVIS-Team/SoundVisualizer-Windows'}
PAGES = [os.path.join(SITE, 'index.html'), os.path.join(SITE, 'en', 'index.html')]


def get(url):
    req = urllib.request.Request(url, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'sovis-site-build'})
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r), r.headers.get('Link', '')


def count(repo):
    total, url = 0, f'https://api.github.com/repos/{repo}/releases?per_page=100'
    while url:
        releases, link = get(url)
        for rel in releases:
            for a in rel.get('assets', []):
                if re.search(r'\.(apk|zip)$', a['name'], re.I):
                    total += a.get('download_count', 0)
        m = re.search(r'<([^>]+)>;\s*rel="next"', link)
        url = m.group(1) if m else None
    return total


def main():
    try:
        n = {k: count(v) for k, v in REPOS.items()}
    except Exception as e:  # 배포는 계속한다
        print(f'다운로드 수를 받지 못함: {e}')
        return 0
    n['all'] = n['android'] + n['windows']
    for path in PAGES:
        html = open(path, encoding='utf-8').read()
        html, found = re.subn(r'(<span data-dl="(all|android|windows)">)[^<]*(</span>)',
                              lambda m: m.group(1) + f'{n[m.group(2)]:,}' + m.group(3), html)
        if found == 0:
            print(f'{path}: 숫자 자리(data-dl)가 없음')
            return 1
        html = html.replace('data-dl-wrap hidden', 'data-dl-wrap')
        open(path, 'w', encoding='utf-8', newline='').write(html)
    print('다운로드 수:', json.dumps(n, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
