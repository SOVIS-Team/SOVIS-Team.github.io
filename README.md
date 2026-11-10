# SOVIS 웹사이트

청각장애인을 위한 앱 [SoundVisualizer](https://github.com/bibibic76/SoundVisualizer)의 소개 사이트입니다. 프레임워크 없는 정적 사이트이고, 의존성이 없습니다.

```bash
node build.mjs          # src 와 public 으로 dist/ 를 만든다
node tools/serve.mjs    # dist/ 를 http://localhost:4173/ 에서 본다
```

| 위치 | 내용 |
| --- | --- |
| `src/pages/` | 페이지. 첫 줄의 JSON 에 제목, 설명, 주소, 쓰는 스크립트를 적는다 |
| `src/partials/` | 머리, 메뉴, 바닥, 버전 비교표 |
| `src/css/site.css` | 스타일 |
| `src/js/overlay-core.js` | 앱의 `VisualizerEngine.kt` 를 옮긴 계산과 그리기 |
| `src/js/film.js` | 첫 화면 영상과 오버레이 |
| `src/js/hero-track.js` | 첫 화면 영상의 소리에서 뽑은 좌우 크기와 장면 정보 |
| `src/js/stage.js` | 체험 화면과 합성음 |
| `public/` | 영상, 사진, 글꼴, 아이콘 |

`main` 에 올리면 GitHub Actions 가 빌드해 GitHub Pages 로 배포합니다. 내부 주소는 모두 상대 경로라 자체 도메인으로 옮겨도 그대로 동작합니다. 자체 도메인을 쓰면 저장소 Pages 설정에서 도메인을 지정하고, 빌드 주소는 Actions 가 알아서 넘겨 줍니다.

## 저작권

- 사이트 코드: Apache-2.0
- 영상의 영화 장면: Tears of Steel, © Blender Foundation, mango.blender.org, CC BY 3.0
- 글꼴: Pretendard, SIL Open Font License 1.1
