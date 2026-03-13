const statusEl = document.getElementById("status");
const videoEl = document.getElementById("camera");
const previewWrap = document.querySelector(".preview-wrap");
const startButton = document.getElementById("start-btn");
const captureButton = document.getElementById("capture-btn");
const captureCanvas = document.getElementById("capture-canvas");
const galleryGrid = document.getElementById("gallery-grid");
const galleryEmpty = document.getElementById("gallery-empty");

let stream;
let cleanupVideoReadyListeners = null;
captureButton.disabled = true;

function setStatus(message) {
  statusEl.textContent = message;
}

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

function isCameraSupported() {
  return !!(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function syncPreviewAspectRatio() {
  if (!previewWrap) {
    return false;
  }

  const { videoWidth, videoHeight } = videoEl;

  if (videoWidth === 0 || videoHeight === 0) {
    return false;
  }

  previewWrap.style.aspectRatio = `${videoWidth} / ${videoHeight}`;
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
    if (!syncPreviewAspectRatio()) {
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
    setStatus("이 브라우저는 카메라 API(getUserMedia)를 지원하지 않습니다.");
    startButton.disabled = true;
    captureButton.disabled = true;
    return;
  }

  setStatus("카메라 권한을 요청 중입니다...");
  startButton.disabled = true;
  captureButton.disabled = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    videoEl.srcObject = stream;
    setupVideoReadySync();

    setStatus("카메라가 연결되었습니다.");
    captureButton.disabled = false;
  } catch (error) {
    if (error.name === "NotAllowedError") {
      setStatus("카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.");
    } else if (error.name === "NotFoundError") {
      setStatus("사용 가능한 카메라 장치를 찾을 수 없습니다.");
    } else {
      setStatus(`카메라 시작에 실패했습니다: ${error.name}`);
    }

    startButton.disabled = false;
    captureButton.disabled = true;
  }
}

function capturePhoto() {
  if (!stream || !videoEl.srcObject) {
    setStatus("먼저 카메라를 시작해 주세요.");
    return;
  }

  if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
    setStatus("카메라 프레임을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    return;
  }

  try {
    const sourceWidth = videoEl.videoWidth;
    const sourceHeight = videoEl.videoHeight;

    captureCanvas.width = sourceWidth;
    captureCanvas.height = sourceHeight;

    const context = captureCanvas.getContext("2d");

    if (!context) {
      setStatus("캡처에 필요한 캔버스 컨텍스트를 가져올 수 없습니다.");
      return;
    }

    context.drawImage(videoEl, 0, 0, sourceWidth, sourceHeight);

    captureCanvas.toBlob((blob) => {
      if (!blob) {
        setStatus("사진 캡처에 실패했습니다.");
        return;
      }

      savePhoto(blob)
        .then((id) => {
          addGalleryItem(id, blob);
          galleryEmpty.hidden = true;
          setStatus("사진을 캡처하여 저장했습니다.");
        })
        .catch(() => {
          setStatus("사진 저장에 실패했습니다.");
        });
    }, "image/png");
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    setStatus(`사진 캡처에 실패했습니다: ${errorName}`);
  }
}

function addGalleryItem(id, blob) {
  const url = URL.createObjectURL(blob);

  const item = document.createElement("div");
  item.className = "gallery-item";
  item.dataset.id = id;

  const img = document.createElement("img");
  img.src = url;
  img.alt = "캡처한 사진";

  const actions = document.createElement("div");
  actions.className = "gallery-item-actions";

  const dlBtn = document.createElement("button");
  dlBtn.type = "button";
  dlBtn.textContent = "저장";
  dlBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = generateFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "delete-btn";
  delBtn.textContent = "삭제";
  delBtn.addEventListener("click", () => {
    deletePhoto(id)
      .then(() => {
        URL.revokeObjectURL(url);
        item.remove();
        updateGalleryEmptyState();
        setStatus("사진을 삭제했습니다.");
      })
      .catch(() => {
        setStatus("사진 삭제에 실패했습니다.");
      });
  });

  actions.appendChild(dlBtn);
  actions.appendChild(delBtn);
  item.appendChild(img);
  item.appendChild(actions);

  galleryGrid.prepend(item);
}

function updateGalleryEmptyState() {
  galleryEmpty.hidden = galleryGrid.children.length > 0;
}

async function loadGallery() {
  try {
    const photos = await getAllPhotos();

    if (photos.length === 0) {
      galleryEmpty.hidden = false;
      return;
    }

    galleryEmpty.hidden = true;

    for (const photo of photos.reverse()) {
      addGalleryItem(photo.id, photo.blob);
    }
  } catch {
    // IndexedDB를 사용할 수 없는 환경에서는 갤러리를 비워둠
  }
}

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

startButton.addEventListener("click", startCamera);
captureButton.addEventListener("click", capturePhoto);

registerServiceWorker();
loadGallery();

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

  captureButton.disabled = true;
});
