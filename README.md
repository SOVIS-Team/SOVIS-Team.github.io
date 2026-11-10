# SOVIS 웹사이트

https://sovis-team.github.io/ 에 올라가는 SOVIS 소개 사이트입니다.

사이트의 원본은 이 폴더 바깥의 `SV모든것/index.html` 한 파일입니다. 내용을 고칠 때는 그 파일을 고친 뒤 아래를 실행하고, 바뀐 `site/` 를 커밋해 `main` 에 올립니다. 올리면 GitHub Actions 가 그대로 배포합니다.

```bash
python -I -X utf8 tools/build.py   # SV모든것/index.html → site/
```

변환 도구가 하는 일:

- HTML 안에 박힌 이미지를 `site/assets/img/` 파일로 빼서 페이지를 가볍게 합니다.
- 공유 미리보기, 대표 주소, 검색엔진용 파일, 없는 주소 안내(`404.html`)를 붙입니다.
- `/android` 처럼 들어온 주소는 `/#/android` 화면으로 보냅니다.

공유 미리보기 그림은 `site/assets/og.jpg` 입니다.
