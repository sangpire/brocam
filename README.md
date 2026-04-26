# BROCAM

BROCAM은 미니멀하고 산업적인 디자인 언어를 가진 고성능 웹 카메라 PWA(Progressive Web App)입니다. 라이카(Leica)의 미학에서 영감을 받아 흑백의 높은 대비와 강렬한 레드 포인트를 특징으로 하며, 외부 의존성 없이 Vanilla JavaScript와 브라우저 표준 API만으로 구현되었습니다.

---

### 🚀 [BROCAM 라이브 데모 바로가기](https://sangpire.github.io/brocam/)

---

## 핵심 컨셉

- **미니멀리즘 & 산업 디자인**: 불필요한 장식을 배제하고 기능에 집중한 UI.
- **고해상도 촬영**: 브라우저가 지원하는 최대 해상도(최적 4K)로 사진을 캡처합니다.
- **로컬 우선(Local-first)**: 모든 사진은 브라우저 내부의 IndexedDB에 안전하게 저장됩니다.
- **PWA**: 서비스 워커를 통한 오프라인 지원 및 앱 설치 기능을 제공합니다.

## 주요 기능

- **카메라 제어**: 전/후면 카메라 전환 및 다중 장치 선택 지원.
- **고화질 캡처**: `ImageCapture` API와 `Canvas` 폴백을 사용하여 최상의 화질을 보장합니다.
- **갤러리**: 촬영한 사진을 날짜순(최신순)으로 확인하고 관리할 수 있습니다.
- **사진 뷰어**: 저장된 사진을 크게 보고, 개별 다운로드 및 삭제가 가능합니다.
- **오프라인 모드**: 네트워크 연결이 없는 상태에서도 앱을 실행하고 갤러리를 확인할 수 있습니다.

## 기술 스택 및 원칙

- **언어**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **저장소**: IndexedDB (`db.js`)
- **PWA**: Service Worker (`sw.js`), Web Manifest (`manifest.webmanifest`)
- **디자인 가이드**:
  - **Typography**: Geometric Sans-serif ('Inter')
  - **Color**: Black (#000000), White (#FFFFFF), Leica Red (#D4001A)
  - **Shape**: 날카로운 모서리 (2px border-radius)
  - **Interaction**: 상단 케이스 위주의 기술적 레이블 및 대문자 표기

## 설치 및 실행 방법

BROCAM은 카메라 API 보안 정책에 따라 `HTTPS` 또는 `localhost` 환경에서만 동작합니다.

### 로컬 실행

1. 저장소를 클론합니다.
2. 로컬 서버를 실행합니다.

```bash
# Python 사용 시
python3 -m http.server 8080

# Node.js serve 사용 시
npx serve -l 8080
```

3. 브라우저에서 `http://localhost:8080`에 접속합니다.

## 프로젝트 구조

- `index.html`: 앱의 구조 및 탭 레이아웃 정의
- `styles.css`: 산업 디자인 컨셉의 스타일링 및 반응형 레이아웃
- `app.js`: 카메라 제어, 캡처 로직, UI 인터랙션 및 서비스 워커 등록
- `db.js`: IndexedDB를 이용한 사진 데이터 영속성 관리
- `sw.js`: 오프라인 캐싱 및 리소스 관리

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 자유롭게 사용 및 수정이 가능합니다.
