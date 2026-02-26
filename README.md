# brocam (학습용)

Vanilla HTML/CSS/JavaScript로 PWA 핵심 개념을 단계적으로 학습하기 위한 예제 프로젝트입니다.

## 목표

- `getUserMedia`로 카메라 접근 이해
- `<canvas>` 기반 사진 캡처 이해
- 이후 단계에서 PWA 필수 요소(Manifest, Service Worker, 오프라인) 확장

## 현재 구현 상태

- 1단계: 카메라 미리보기 (`<video>`)
- 2단계: 사진 캡처 후 화면 표시 (`<canvas>` -> `<img>`, 최신 1장)

## 실행 방법

카메라 API는 `HTTPS` 또는 `localhost`에서 동작하므로, 로컬 서버로 실행해야 합니다.

방법 1) `python3` 사용

```bash
cd /Users/sangpire/codes/brocam
python3 -m http.server 8080
```

방법 2) `npx` 사용

```bash
cd /Users/sangpire/codes/brocam
npx serve -l 8080
```

브라우저에서 `http://localhost:8080` 접속 후 아래 순서로 확인합니다.

1. `카메라 시작` 클릭
2. 권한 허용
3. `사진 캡처` 클릭

## Manifest/SW 점검 절차

1. Chrome DevTools > Application > Manifest에서 앱 메타데이터 확인
2. Chrome DevTools > Application > Service Workers에서 `sw.js` 등록/활성 상태 확인
3. 온라인에서 1회 로드 후 DevTools > Network를 `Offline`으로 전환
4. 새로고침 시 앱 셸(`index.html`, `styles.css`, `app.js`)이 캐시로 로드되는지 확인

## 파일 구조

- `index.html`: 화면 구조(비디오, 버튼, 캡처 결과 영역)
- `styles.css`: 레이아웃/반응형/캡처 결과 스타일
- `app.js`: 카메라 시작, 권한 처리, 캡처 로직

## 동작 요약

- 카메라 시작 성공 시 캡처 버튼 활성화
- 캡처 시 현재 비디오 프레임을 캔버스에 그린 뒤 PNG 데이터 URL로 결과 이미지 표시
- 권한 거부/장치 없음/미지원 브라우저 예외 메시지 처리

## PWA 구성요소(3단계)

- `manifest.webmanifest`: 앱 이름, 실행 방식, 테마 색상 등 메타데이터 정의
- `sw.js`: 앱 셸 리소스 캐시 및 오프라인 대응을 위한 Service Worker
- `app.js` 등록 로직: 지원 브라우저 + 보안 컨텍스트에서 Service Worker 등록

## GitHub Pages 배포

1. 저장소 루트에 `.github/workflows/deploy-pages.yml`이 있는지 확인합니다.
2. `main` 브랜치로 push합니다.
3. GitHub 저장소 `Settings > Pages`에서 `Build and deployment > Source`를 `GitHub Actions`로 선택합니다.
4. `Actions` 탭에서 `Deploy GitHub Pages` 워크플로가 성공하면 배포 URL이 생성됩니다.

현재는 `https://sangpire.github.io/brocam/` 에서 확인할 수 있습니다.
초기 배포 반영에는 보통 1~5분 정도 소요됩니다.

### 배포 후 검증 체크리스트

- [ ] 배포 URL 접속 시 `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`가 정상 응답한다.
- [ ] Chrome DevTools > Application > Manifest에서 앱 메타데이터와 아이콘(`192x192`, `512x512`)이 보인다.
- [ ] Chrome DevTools > Application > Service Workers에서 `sw.js`가 등록/활성 상태다.
- [ ] 온라인에서 1회 접속 후 Network를 `Offline`으로 바꾸고 새로고침해도 앱 셸이 열린다.
- [ ] `카메라 시작` 버튼으로 권한 요청이 뜨고, 허용 시 미리보기/캡처가 동작한다.
- [ ] 카메라 권한을 거부하면 안내 문구가 표시된다.

## 다음 학습 단계(권장)

1. `manifest.webmanifest` 추가
2. `service worker` 등록 및 앱 셸 캐시
3. 오프라인 동작 확인(DevTools Application 탭)
4. 필요 시 IndexedDB 기반 캡처 이미지 저장
