import React, { useEffect, useRef, useState } from "react";
// ...existing code...
import { uploadMedia } from "../api";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useTranslation } from "react-i18next";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/*
  ==============================
  BodyPoseRecorder.jsx
  ------------------------------
  即時偵測全身骨架、計算主要關節角度，並提供：
    • 姿勢分類 (舉手 / 深蹲 / T‑Pose… 可擴充)
    • 五色分級 (ROM) 與歷史折線圖
    • 施測倒數計時 & 錄影下載
  ==============================
*/

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

const JOINTS = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
};

const ANGLE_PAIRS = [
  [JOINTS.leftShoulder, JOINTS.leftElbow, JOINTS.leftWrist],
  [JOINTS.rightShoulder, JOINTS.rightElbow, JOINTS.rightWrist],
  [JOINTS.leftHip, JOINTS.leftKnee, JOINTS.leftAnkle],
  [JOINTS.rightHip, JOINTS.rightKnee, JOINTS.rightAnkle],
  [JOINTS.leftShoulder, JOINTS.leftHip, JOINTS.leftKnee],
  [JOINTS.rightShoulder, JOINTS.rightHip, JOINTS.rightKnee],
];

const ANGLE_LABELS = [
  "L‑Elbow",
  "R‑Elbow",
  "L‑Knee",
  "R‑Knee",
  "L‑Hip",
  "R‑Hip",
];

function vec2dAngle(pA, pB, pC) {
  const v1 = [pA.x - pB.x, pA.y - pB.y];
  const v2 = [pC.x - pB.x, pC.y - pB.y];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.hypot(...v1);
  const mag2 = Math.hypot(...v2);
  if (mag1 * mag2 === 0) return 180;
  let cos = dot / (mag1 * mag2);
  cos = Math.min(Math.max(cos, -1), 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

function gradeColor(angle, thresholds = [30, 60, 90, 120, 150]) {
  if (angle >= thresholds[4]) return "green";
  if (angle >= thresholds[3]) return "limegreen";
  if (angle >= thresholds[2]) return "orange";
  if (angle >= thresholds[1]) return "darkorange";
  return "red";
}

// 需由父層傳入user, taskId, role
export default function BodyPoseRecorder({ user, taskId, role }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [angles, setAngles] = useState([]);
  const [history, setHistory] = useState([]);
  const [testing, setTesting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [firebaseUrl, setFirebaseUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const { t } = useTranslation();

  useEffect(() => {
    const pose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(res => {
      const ctx = canvasRef.current.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
      ctx.drawImage(res.image, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

      if (res.poseLandmarks) {
        res.poseLandmarks.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x * VIDEO_WIDTH, pt.y * VIDEO_HEIGHT, 4, 0, 2 * Math.PI);
          ctx.fillStyle = "#ff375f";
          ctx.fill();
        });

        const current = ANGLE_PAIRS.map(([a, b, c]) =>
          vec2dAngle(res.poseLandmarks[a], res.poseLandmarks[b], res.poseLandmarks[c]).toFixed(0)
        );
        setAngles(current);
        setHistory(h => [...h.slice(-59), current]);

        ANGLE_PAIRS.forEach(([, mid], idx) => {
          const pt = res.poseLandmarks[mid];
          ctx.fillStyle = gradeColor(current[idx]);
          ctx.font = "12px Arial";
          ctx.fillText(current[idx], pt.x * VIDEO_WIDTH + 6, pt.y * VIDEO_HEIGHT - 6);
        });
      }
      ctx.restore();
    });

    let camera;
    const init = () => {
      if (!videoRef.current) return requestAnimationFrame(init);
      camera = new cam.Camera(videoRef.current, {
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        onFrame: async () => {
          await pose.send({ image: videoRef.current });
        },
      });
      camera.start();
    };
    init();

    return () => {
      camera?.stop();
      pose.close();
    };
  }, []);

  const startTest = () => {
    if (testing) return;
    setTesting(true);

    const stream = canvasRef.current.captureStream(30);
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = e => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setDownloadUrl(URL.createObjectURL(blob));
      setUploading(true);
      try {
        if (!user || !user.uid || !taskId || !role) throw new Error("缺少user、taskId或role");
        // 產生唯一檔名
        const fileName = `pose_test_${Date.now()}.webm`;
        // 呼叫api.js的uploadMedia
        const fileObj = new File([blob], fileName, { type: "video/webm" });
        const url = await uploadMedia(fileObj, user.uid, 'task', taskId, role, null, 'pose');
        console.log("Uploaded to:", url);
        setFirebaseUrl(url);
      } catch (err) {
        alert("上傳影片到雲端失敗: " + err.message);
      }
      setUploading(false);
    };
    mediaRecorderRef.current.start();

    let sec = 8;
    setCountdown(sec);
    const id = setInterval(() => {
      sec -= 1;
      setCountdown(sec);
      if (sec <= 0) {
        clearInterval(id);
        setTesting(false);
        setCountdown(null);
        mediaRecorderRef.current.stop();
      }
    }, 1000);
  };

  const chartData = {
    labels: history.map((_, i) => `#${i + 1}`),
    datasets: ANGLE_LABELS.map((label, idx) => ({
      label,
      data: history.map(h => h[idx]),
      borderColor: `hsl(${idx * 60}, 70%, 50%)`,
      backgroundColor: `hsl(${idx * 60}, 70%, 50%)`,
      pointRadius: 1,
      tension: 0.2,
      borderWidth: 2,
    })),
  };

  return (
    <div className="container py-3 text-center">
      <h4>{t("body_pose_title", "Body Movement Analysis")}</h4>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} style={{ border: "1px solid #333" }} />

      <div className="mt-2">
        <button className="btn btn-primary btn-sm" onClick={startTest} disabled={testing}>
          {testing ? t("testing", "Testing…") : t("start_test", "Start 8‑s Test")}
        </button>
        {countdown !== null && (
          <p className="mt-1">
            {t("countdown", "Countdown")}: {countdown}s
          </p>
        )}
      </div>

      {angles.length > 0 && (
        <table className="table table-sm table-bordered mt-3" style={{ maxWidth: 400, margin: "0 auto" }}>
          <thead>
            <tr>
              {ANGLE_LABELS.map(l => (
                <th key={l}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {angles.map((a, i) => (
                <td key={i} style={{ color: gradeColor(a) }}>{a}°</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {history.length >= 2 && (
        <div className="mt-4">
    <Line
      data={chartData}
      options={{
        responsive: true,
        plugins: {
          legend: {           // ⚠️ 這裡只需要這一層
            display: true,
          },
        },
        // 如果還想固定比例，可以加上：
        // maintainAspectRatio: false,
      }}
    />
  </div>
      )}

      {downloadUrl && (
        <div className="mt-3">
          <a className="btn btn-success btn-sm me-2" href={downloadUrl} download="pose_test.webm">
            {t("download_recording", "Download Local")}
          </a>
          {uploading && <span className="text-info">雲端上傳中...</span>}
          {firebaseUrl && (
            <a className="btn btn-warning btn-sm ms-2" href={firebaseUrl} target="_blank" rel="noopener noreferrer">
              {t("download_cloud", "Open in Cloud")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}