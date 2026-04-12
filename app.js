const statusEl = document.getElementById("status");
const videoEl = document.getElementById("camera");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const shutterBtn = document.getElementById("shutter-btn");
const switchCameraBtn = document.getElementById("switch-camera-btn");
const flashOverlay = document.getElementById("flash-overlay");
const captureCanvas = document.getElementById("capture-canvas");
const galleryGrid = document.getElementById("gallery-grid");
const galleryEmpty = document.getElementById("gallery-empty");
const photoCount = document.getElementById("photo-count");
const tabBarItems = document.querySelectorAll(".tab-bar-item");

// 사진 뷰어 요소
const photoViewer = document.getElementById("photo-viewer");
const viewerImage = document.getElementById("viewer-image");
const viewerClose = document.getElementById("viewer-close");
const viewerDownload = document.getElementById("viewer-download");
const viewerDelete = document.getElementById("viewer-delete");

const cameraSelect = document.getElementById("camera-select");
const lastPhotoBtn = document.getElementById("last-photo-btn");
const lastPhotoThumb = document.getElementById("last-photo-thumb");

let stream;
let cleanupVideoReadyListeners = null;
let currentFacingMode = "environment";
let currentDeviceId = null;
let currentViewerPhotoId = null;
let currentViewerUrl = null;
let lastPhotoId = null;
let lastPhotoUrl = null;

shutterBtn.disabled = true;

// ── 화면 세로 고정 ──

function lockPortrait() {
  const orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
  if (orientation && typeof orientation.lock === "function") {
    orientation.lock("portrait").catch(() => {});
  }
}

lockPortrait();

// ── 상태 표시 ──

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status-badge";
  if (type) {
    statusEl.classList.add(type);
  }
}

// ── 탭 전환 ──

function switchTab(tabName) {
  document.querySelectorAll(".tab-view").forEach((view) => {
    view.classList.remove("active");
  });
  tabBarItems.forEach((item) => {
    item.classList.remove("active");
  });

  document.getElementById(`tab-${tabName}`).classList.add("active");
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
}

tabBarItems.forEach((item) => {
  item.addEventListener("click", () => {
    switchTab(item.dataset.tab);
  });
});

// ── 파일명 생성 ──

function generateFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `brocam-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
}

// ── 카메라 ──

function isCameraSupported() {
  return !!(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

async function enumerateCameras() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "videoinput");
}

async function populateCameraSelect() {
  const cameras = await enumerateCameras();

  cameraSelect.innerHTML = "";

  if (cameras.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "카메라 없음";
    cameraSelect.appendChild(option);
    cameraSelect.disabled = true;
    return;
  }

  for (let i = 0; i < cameras.length; i++) {
    const cam = cameras[i];
    const option = document.createElement("option");
    option.value = cam.deviceId;
    option.textContent = cam.label || `카메라 ${i + 1}`;
    cameraSelect.appendChild(option);
  }

  if (currentDeviceId) {
    cameraSelect.value = currentDeviceId;
  }

  cameraSelect.disabled = cameras.length <= 1;
}

cameraSelect.addEventListener("change", async () => {
  const deviceId = cameraSelect.value;
  if (!deviceId || deviceId === currentDeviceId) return;

  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  currentDeviceId = deviceId;
  await startCamera();
});

function syncPreviewAspectRatio() {
  // 앱 스타일에서는 전체 화면을 채우므로 별도 비율 조정 불필요
  return true;
}

function setupVideoReadySync() {
  if (cleanupVideoReadyListeners) {
    cleanupVideoReadyListeners();
    cleanupVideoReadyListeners = null;
  }

  const eventNames = ["loadedmetadata", "loadeddata", "canplay"];
  let timeoutId = window.setTimeout(() => {
    cleanup();
  }, 5000);

  const handleVideoReady = () => {
    if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
      return;
    }
    cleanup();
  };

  const cleanup = () => {
    for (const eventName of eventNames) {
      videoEl.removeEventListener(eventName, handleVideoReady);
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (cleanupVideoReadyListeners === cleanup) {
      cleanupVideoReadyListeners = null;
    }
  };

  cleanupVideoReadyListeners = cleanup;

  for (const eventName of eventNames) {
    videoEl.addEventListener(eventName, handleVideoReady);
  }

  handleVideoReady();
}

async function startCamera() {
  if (!isCameraSupported()) {
    setStatus("미지원", "error");
    shutterBtn.disabled = true;
    return;
  }

  setStatus("연결 중...");
  shutterBtn.disabled = true;

  try {
    const videoConstraints = currentDeviceId
      ? {
          deviceId: { exact: currentDeviceId },
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        }
      : {
          facingMode: currentFacingMode,
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        };

    stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });

    // 현재 활성 카메라의 deviceId를 기록
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      if (settings.deviceId) {
        currentDeviceId = settings.deviceId;
      }
    }

    videoEl.srcObject = stream;
    setupVideoReadySync();

    await populateCameraSelect();

    cameraPlaceholder.classList.add("hidden");
    setStatus("촬영 준비", "connected");
    shutterBtn.disabled = false;
  } catch (error) {
    if (error.name === "NotAllowedError") {
      setStatus("권한 거부", "error");
    } else if (error.name === "NotFoundError") {
      setStatus("카메라 없음", "error");
    } else {
      setStatus("연결 실패", "error");
    }

    shutterBtn.disabled = true;
  }
}

async function switchCamera() {
  const cameras = await enumerateCameras();

  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  if (cameras.length > 1 && currentDeviceId) {
    const currentIndex = cameras.findIndex((c) => c.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    currentDeviceId = cameras[nextIndex].deviceId;
  } else {
    currentDeviceId = null;
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  }

  await startCamera();
}

// ── 사진 촬영 ──

function triggerFlash() {
  flashOverlay.classList.remove("flash");
  void flashOverlay.offsetWidth; // reflow
  flashOverlay.classList.add("flash");
}

function handleCaptureSuccess(id, blob) {
  addGalleryItem(id, blob);
  galleryEmpty.hidden = true;
  updatePhotoCount();
  updateLastPhotoThumb(id, blob);
}

async function capturePhoto() {
  if (!stream || !videoEl.srcObject) {
    return;
  }

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) return;

  // 1. ImageCapture API 시도 (가장 높은 해상도)
  if ("ImageCapture" in window) {
    try {
      const imageCapture = new ImageCapture(videoTrack);
      const blob = await imageCapture.takePhoto();
      triggerFlash();
      const id = await savePhoto(blob);
      handleCaptureSuccess(id, blob);
      return;
    } catch (e) {
      console.warn("ImageCapture 실패, 캔버스 방식으로 대체합니다.", e);
    }
  }

  // 2. 캔버스 기반 캡처 (Fallback)
  if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
    return;
  }

  try {
    const sourceWidth = videoEl.videoWidth;
    const sourceHeight = videoEl.videoHeight;

    captureCanvas.width = sourceWidth;
    captureCanvas.height = sourceHeight;

    const context = captureCanvas.getContext("2d");

    if (!context) {
      return;
    }

    context.drawImage(videoEl, 0, 0, sourceWidth, sourceHeight);
    triggerFlash();

    captureCanvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      savePhoto(blob)
        .then((id) => {
          handleCaptureSuccess(id, blob);
        })
        .catch(() => {
          setStatus("저장 실패", "error");
        });
    }, "image/png");
  } catch {
    setStatus("촬영 실패", "error");
  }
}

// ── 갤러리 ──

function addGalleryItem(id, blob) {
  const url = URL.createObjectURL(blob);

  const item = document.createElement("div");
  item.className = "gallery-item";
  item.dataset.id = id;

  const img = document.createElement("img");
  img.src = url;
  img.alt = "캡처한 사진";

  item.addEventListener("click", () => {
    openViewer(id, url);
  });

  item.appendChild(img);
  galleryGrid.prepend(item);
}

function updatePhotoCount() {
  const count = galleryGrid.children.length;
  photoCount.textContent = `${count}장`;
  galleryEmpty.hidden = count > 0;
}

async function loadGallery() {
  try {
    const photos = await getAllPhotos();

    if (photos.length === 0) {
      galleryEmpty.hidden = false;
      updatePhotoCount();
      return;
    }

    galleryEmpty.hidden = true;

    const sorted = photos.reverse();
    for (const photo of sorted) {
      addGalleryItem(photo.id, photo.blob);
    }

    updatePhotoCount();

    if (sorted.length > 0) {
      updateLastPhotoThumb(sorted[0].id, sorted[0].blob);
    }
  } catch {
    // IndexedDB를 사용할 수 없는 환경에서는 갤러리를 비워둠
  }
}

// ── 마지막 사진 썸네일 ──

function updateLastPhotoThumb(id, blob) {
  if (lastPhotoUrl) {
    URL.revokeObjectURL(lastPhotoUrl);
  }
  lastPhotoUrl = URL.createObjectURL(blob);
  lastPhotoId = id;
  lastPhotoThumb.src = lastPhotoUrl;
  lastPhotoBtn.hidden = false;
}

lastPhotoBtn.addEventListener("click", () => {
  if (lastPhotoId !== null && lastPhotoUrl) {
    openViewer(lastPhotoId, lastPhotoUrl);
  }
});

// ── 사진 뷰어 ──

function openViewer(id, url) {
  currentViewerPhotoId = id;
  currentViewerUrl = url;
  viewerImage.src = url;
  photoViewer.classList.add("open");
}

function closeViewer() {
  photoViewer.classList.remove("open");
  currentViewerPhotoId = null;
  currentViewerUrl = null;
}

viewerClose.addEventListener("click", closeViewer);

viewerDownload.addEventListener("click", () => {
  if (!currentViewerUrl) return;
  const link = document.createElement("a");
  link.href = currentViewerUrl;
  link.download = generateFilename();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

viewerDelete.addEventListener("click", () => {
  if (currentViewerPhotoId === null) return;
  const id = currentViewerPhotoId;
  const url = currentViewerUrl;

  deletePhoto(id)
    .then(() => {
      const item = galleryGrid.querySelector(`[data-id="${id}"]`);
      if (item) {
        item.remove();
      }
      if (url) {
        URL.revokeObjectURL(url);
      }
      updatePhotoCount();
      closeViewer();

      // 삭제된 사진이 마지막 썸네일이면 갱신
      if (lastPhotoId === id) {
        const firstItem = galleryGrid.querySelector(".gallery-item");
        if (firstItem) {
          const firstImg = firstItem.querySelector("img");
          lastPhotoId = Number(firstItem.dataset.id);
          if (lastPhotoUrl) URL.revokeObjectURL(lastPhotoUrl);
          lastPhotoUrl = firstImg.src;
          lastPhotoThumb.src = lastPhotoUrl;
        } else {
          lastPhotoId = null;
          lastPhotoUrl = null;
          lastPhotoBtn.hidden = true;
        }
      }
    })
    .catch(() => {
      // 삭제 실패 시 뷰어 유지
    });
});

// ── 서비스 워커 ──

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if (location.protocol !== "https:" && !isLocalhost) {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// ── 이벤트 바인딩 ──

shutterBtn.addEventListener("click", capturePhoto);
switchCameraBtn.addEventListener("click", switchCamera);

// ── 초기화 ──

registerServiceWorker();
loadGallery();
startCamera();

window.addEventListener("beforeunload", () => {
  if (cleanupVideoReadyListeners) {
    cleanupVideoReadyListeners();
    cleanupVideoReadyListeners = null;
  }

  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }

  shutterBtn.disabled = true;
});
