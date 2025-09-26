import React, { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';
import ROMAssessmentPanel from './ROMAssessmentPanel';// ✅ 加入 ROM 元件
import { useTranslation } from 'react-i18next'

const VIDEO_WIDTH = 540;
const VIDEO_HEIGHT = 310;
const fingerJoints = [
  [0, 1, 2, 3, 4],     // Thumb
  [5, 6, 7, 8],        // Index
  [9, 10, 11, 12],     // Middle
  [13, 14, 15, 16],    // Ring
  [17, 18, 19, 20],    // Pinky
];
const fingerColors = ['red', 'green', 'blue', 'orange', 'purple'];

function vector2dAngle(v1, v2) {
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.hypot(...v1);
  const mag2 = Math.hypot(...v2);
  if (mag1 * mag2 === 0) return 180;
  let cosTheta = dot / (mag1 * mag2);
  cosTheta = Math.min(Math.max(cosTheta, -1), 1);
  return Math.acos(cosTheta) * (180 / Math.PI);
}

function computeJointAngles(landmarks) {
  const pts = landmarks.map(pt => [pt.x * VIDEO_WIDTH, pt.y * VIDEO_HEIGHT]);
  const anglesPerFinger = [];

  for (let joints of fingerJoints) {
    const angles = [];
    for (let i = 0; i < joints.length - 2; i++) {
      const a = pts[joints[i]];
      const b = pts[joints[i + 1]];
      const c = pts[joints[i + 2]];
      const v1 = [a[0] - b[0], a[1] - b[1]];
      const v2 = [c[0] - b[0], c[1] - b[1]];
      angles.push(vector2dAngle(v1, v2));
    }
    anglesPerFinger.push(angles);
  }

  return anglesPerFinger;
}

function computeThumbToPalmAngle(landmarks) {
  const pts = landmarks.map(pt => [pt.x * VIDEO_WIDTH, pt.y * VIDEO_HEIGHT]);
  const wrist = pts[0];
  const thumbBase = pts[2];
  const thumbTip = pts[4];
  const palmCenter = [
    (pts[5][0] + pts[9][0] + pts[13][0] + pts[17][0]) / 4,
    (pts[5][1] + pts[9][1] + pts[13][1] + pts[17][1]) / 4,
  ];
  const vPalm = [palmCenter[0] - wrist[0], palmCenter[1] - wrist[1]];
  const vThumb = [thumbTip[0] - thumbBase[0], thumbTip[1] - thumbBase[1]];

  return vector2dAngle(vThumb, vPalm);
}

function handAngle(landmarks) {
  const pts = landmarks.map(pt => [pt.x * VIDEO_WIDTH, pt.y * VIDEO_HEIGHT]);
  const angles = [];
  const pairs = [
    [0, 2, 3, 4],
    [0, 6, 7, 8],
    [0, 10, 11, 12],
    [0, 14, 15, 16],
    [0, 18, 19, 20],
  ];
  for (let [base, mid, tip1, tip2] of pairs) {
    const v1 = [pts[base][0] - pts[mid][0], pts[base][1] - pts[mid][1]];
    const v2 = [pts[tip1][0] - pts[tip2][0], pts[tip1][1] - pts[tip2][1]];
    angles.push(vector2dAngle(v1, v2));
  }
  return angles;
}

function handPos([f1, f2, f3, f4, f5]) {
  if (f1 < 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) return 'good';
  if (f1 >= 50 && f2 >= 50 && f3 < 50 && f4 >= 50 && f5 >= 50) return 'no!!!';
  if (f1 < 50 && f2 < 50 && f3 >= 50 && f4 >= 50 && f5 < 50) return 'ROCK!';
  if (f1 >= 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) return '0';
  if (f1 >= 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 < 50) return 'pink';
  if (f1 >= 50 && f2 < 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) return '1';
  if (f1 >= 50 && f2 < 50 && f3 < 50 && f4 >= 50 && f5 >= 50) return '2';
  if (f1 >= 50 && f2 >= 50 && f3 < 50 && f4 < 50 && f5 < 50) return 'ok';
  if (f1 < 50 && f2 >= 50 && f3 < 50 && f4 < 50 && f5 < 50) return 'ok';
  if (f1 >= 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 > 50) return '3';
  if (f1 >= 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 < 50) return '4';
  if (f1 < 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 < 50) return '5';
  if (f1 < 50 && f2 >= 50 && f3 >= 50 && f4 >= 50 && f5 < 50) return '6';
  if (f1 < 50 && f2 < 50 && f3 >= 50 && f4 >= 50 && f5 >= 50) return '7';
  if (f1 < 50 && f2 < 50 && f3 < 50 && f4 >= 50 && f5 >= 50) return '8';
  if (f1 < 50 && f2 < 50 && f3 < 50 && f4 < 50 && f5 >= 50) return '9';
  return '';
}

import { uploadMedia } from '../api';

export default function HandGestureRecorder({ user, taskId, role }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [gesture, setGesture] = useState('');
  const [handedness, setHandedness] = useState('');
  const [timer, setTimer] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [currentLandmarks, setCurrentLandmarks] = useState(null); // ✅ 加入 landmarks state
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioCloudUrl, setAudioCloudUrl] = useState(null);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [videoCloudUrl, setVideoCloudUrl] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const { t } = useTranslation(); // 💡 加入多語系支援
  useEffect(() => {
    let lastProcessed = 0;
    const hands = new Hands({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(results => {
      const now = Date.now();
    if (now - lastProcessed < 100) return;
    lastProcessed = now;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks?.length) {
        const landmarks = results.multiHandLandmarks[0];
        setCurrentLandmarks(landmarks); // ✅ 記錄目前手部資料
        if (results.multiHandedness && results.multiHandedness.length > 0) {
          const label = results.multiHandedness[0].label;
          setHandedness(label);
        }

        for (const landmarks of results.multiHandLandmarks) {
          fingerJoints.forEach((joints, i) => {
            for (let j = 0; j < joints.length - 1; j++) {
              const start = landmarks[joints[j]];
              const end = landmarks[joints[j + 1]];
              ctx.beginPath();
              ctx.moveTo(start.x * VIDEO_WIDTH, start.y * VIDEO_HEIGHT);
              ctx.lineTo(end.x * VIDEO_WIDTH, end.y * VIDEO_HEIGHT);
              ctx.strokeStyle = fingerColors[i];
              ctx.lineWidth = 3;
              ctx.stroke();
            }
          });

          for (let pt of landmarks) {
            ctx.beginPath();
            ctx.arc(pt.x * VIDEO_WIDTH, pt.y * VIDEO_HEIGHT, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
          }

          const jointAngles = computeJointAngles(landmarks);
          const thumbPalmAngle = computeThumbToPalmAngle(landmarks);

          jointAngles.forEach((angles, fingerIdx) => {
            angles.forEach((angle, j) => {
              const pt = landmarks[fingerJoints[fingerIdx][j + 1]];
              ctx.fillStyle = 'blue';
              ctx.font = '12px Arial';
              ctx.fillText(angle.toFixed(0), pt.x * VIDEO_WIDTH + 5, pt.y * VIDEO_HEIGHT - 5);
            });
          });

          ctx.fillStyle = 'green';
          ctx.font = '14px Arial';
          ctx.fillText(`拇指-掌心角: ${thumbPalmAngle.toFixed(0)}`, 10, 20);

          const angles = handAngle(landmarks);
          const pos = handPos(angles);
          setCurrentLandmarks(landmarks);
          setGesture(pos);
        }
      } else {
        setGesture('');
        setHandedness('');
        setCurrentLandmarks(null); // ✅ 清除
      }
    });

    // ✅ 使用 requestAnimationFrame 等待 videoRef 掛載

  const initCamera = () => {
    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
      });
      camera.start();
    } else {
      requestAnimationFrame(initCamera);
    }
  };
  
  requestAnimationFrame(initCamera);
  
  
  }, []);


  
    const startRecording = async () => {
      // Start audio recording
      let audioStream;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        alert("麥克風權限被拒絕: " + err.message);
        return;
      }
      audioRecorderRef.current = new window.MediaRecorder(audioStream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      audioRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      audioRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        if (user && user.uid && taskId && role) {
          setUploadingAudio(true);
          try {
            const audioFileName = `audio_${Date.now()}.webm`;
            const audioFile = new File([audioBlob], audioFileName, { type: 'audio/webm' });
            const audioCloud = await uploadMedia(audioFile, user.uid, 'task', taskId, role, null, 'audio');
            setAudioCloudUrl(audioCloud);
          } catch (err) {
            alert("上傳錄音到雲端失敗: " + err.message);
          }
          setUploadingAudio(false);
        }
      };
      audioRecorderRef.current.start();

      // Start video recording
      const stream = canvasRef.current.captureStream(30);
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp9',
      });
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        // 上傳影片到雲端
        if (user && user.uid && taskId && role) {
          setUploadingVideo(true);
          try {
            const fileName = `gesture_video_${Date.now()}.webm`;
            const fileObj = new File([blob], fileName, { type: 'video/webm' });
            const videoCloud = await uploadMedia(fileObj, user.uid, 'task', taskId, role, null, 'gesture');
            setVideoCloudUrl(videoCloud);
          } catch (err) {
            alert("上傳影片到雲端失敗: " + err.message);
          }
          setUploadingVideo(false);
        }
      };

      mediaRecorderRef.current.start();

      let seconds = 8;
      setTimer(seconds);
      const countdown = setInterval(() => {
        seconds--;
        setTimer(seconds);
        if (seconds <= 0) {
          clearInterval(countdown);
          setTimer(t('recording_finished'));
          mediaRecorderRef.current.stop();
          audioRecorderRef.current.stop();
        }
      }, 1000);
    };
  
    return (
      <div className="container py-4 text-center">
        <h2>{t('gesture_recording_title')}</h2>
        <video ref={videoRef} style={{ display: 'none' }} />
        <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} style={{ border: '1px solid #333' }} />
  
        <p className="mt-2">{t('gesture_result')}: {gesture}</p>
        <p>
          {t('handedness_result')}：
          {handedness === 'Right' ? t('left_hand') : handedness === 'Left' ? t('right_hand') : t('no_detection')}
        </p>
        <p>{t('countdown')}: {timer}</p>
  
        <button className="btn btn-primary" onClick={startRecording}>
          {t('start_recording')}
        </button>
  
        {downloadUrl && (
          <div className="mt-3">
            <a className="btn btn-success" href={downloadUrl} download="hand_gesture.webm">
              {t('download_recording')}
            </a>
            {uploadingVideo && <span className="ms-2 text-info">{t('uploading', '上傳中...')}</span>}
            {videoCloudUrl && (
              <a className="btn btn-warning btn-sm ms-2" href={videoCloudUrl} target="_blank" rel="noopener noreferrer">
                {t('download_cloud', 'Open in Cloud')}
              </a>
            )}
          </div>
        )}
        {audioUrl && (
          <div className="mt-3">
            <audio controls src={audioUrl} />
            {uploadingAudio && <span className="ms-2 text-info">{t('uploading', '上傳中...')}</span>}
            {audioCloudUrl && (
              <a className="btn btn-info btn-sm ms-2" href={audioCloudUrl} target="_blank" rel="noopener noreferrer">
                {t('download_cloud', 'Audio in Cloud')}
              </a>
            )}
          </div>
        )}
  {/* ✅ 顯示 ROM 評估面板 */}
        {currentLandmarks && <ROMAssessmentPanel landmarks={currentLandmarks} />}
      </div>
    );
  }
  

