# SOVIS 웹사이트

<https://sovis-team.github.io/> (한국어)와 <https://sovis-team.github.io/en/> (영어)에 올라가는 SOVIS 소개 사이트입니다.

사이트의 원본은 이 폴더 바깥의 두 파일입니다.

- `SV모든것/index.html`: 한국어 페이지 → `site/index.html`
- `SV모든것/index_en.html`: 영어 페이지 → `site/en/index.html`

두 파일은 구조, 스타일, 스크립트가 같고 글만 다릅니다. **내용을 고칠 때는 두 파일을 함께 고칩니다.** 한쪽만 고치면 두 언어의 내용이 어긋납니다. 고친 뒤 아래를 실행하고, 바뀐 `site/` 를 커밋해 `main` 에 올립니다. 올리면 GitHub Actions 가 그대로 배포합니다.

```bash
python -I -X utf8 tools/build.py   # SV모든것/index.html, index_en.html → site/
```

변환 도구가 하는 일:

- HTML 안에 박힌 이미지를 `site/assets/img/` 파일로 빼서 페이지를 가볍게 합니다. 두 언어가 같은 파일을 씁니다.
- 원본끼리 서로 가리키는 주소(`index_en.html`, `index.html`)를 사이트 주소(`/en/`, `/`)로 바꿉니다. 그래서 원본 두 파일을 같은 폴더에서 바로 열어도 언어 전환이 됩니다.
- 언어마다 공유 미리보기, 대표 주소, 언어별 주소(`hreflang`), 검색엔진용 파일(`sitemap.xml`, `robots.txt`), 없는 주소 안내(`404.html`)를 붙입니다.
- `/android` 처럼 들어온 주소는 `/#/android` 화면으로, `/en/android` 는 `/en/#/android` 로 보냅니다.

언어 전환:

- 머리글 오른쪽(좁은 화면에서는 메뉴 안)의 `English` / `한국어` 를 누르면 그 선택을 브라우저에 저장하고, 보던 화면 그대로 다른 언어 페이지로 갑니다.
- 저장된 선택이 없으면 브라우저 첫 번째 언어가 한국어이거나 시간대가 `Asia/Seoul` 일 때 한국어, 아니면 영어 페이지를 엽니다.
- 두 원본의 `<head>` 맨 앞 스크립트가 이 일을 합니다. 고칠 때는 두 파일을 똑같이 고칩니다(`PAGE`, `OTHER` 값만 다릅니다).

공유 미리보기 그림은 `site/assets/og.jpg` 입니다(두 언어가 함께 씁니다).
