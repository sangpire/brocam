const statusEl = document.getElementById("status");
const videoEl = document.getElementById("camera");
const startButton = document.getElementById("start-btn");
const captureButton = document.getElementById("capture-btn");
const captureCanvas = document.getElementById("capture-canvas");
const capturedPhoto = document.getElementById("captured-photo");
const captureEmpty = document.getElementById("capture-empty");

let stream;
captureButton.disabled = true;
capturedPhoto.hidden = true;

function setStatus(message) {
  statusEl.textContent = message;
}

function isCameraSupported() {
  return !!(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
  );
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
    captureCanvas.width = videoEl.videoWidth;
    captureCanvas.height = videoEl.videoHeight;

    const context = captureCanvas.getContext("2d");

    if (!context) {
      setStatus("캡처에 필요한 캔버스 컨텍스트를 가져올 수 없습니다.");
      return;
    }

    context.drawImage(videoEl, 0, 0, captureCanvas.width, captureCanvas.height);

    capturedPhoto.src = captureCanvas.toDataURL("image/png");
    capturedPhoto.hidden = false;
    captureEmpty.hidden = true;
    setStatus("사진을 캡처했습니다.");
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    setStatus(`사진 캡처에 실패했습니다: ${errorName}`);
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

  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

startButton.addEventListener("click", startCamera);
captureButton.addEventListener("click", capturePhoto);
registerServiceWorker();

window.addEventListener("beforeunload", () => {
  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }

  captureButton.disabled = true;
});
