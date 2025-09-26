// 整合版 ROM 與職能治療評估元件（五色分級、圖表折線、圖例切換、CSV 匯出、同手指同色系）
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useTranslation } from 'react-i18next'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// 設定五段 ROM 分級閾值
const ROM_THRESHOLDS = {
  thumb: { MCP: [10, 30, 50, 70, 90], IP: [20, 40, 60, 80, 100] },
  index: { MCP: [20, 40, 60, 80, 100], PIP: [30, 50, 70, 90, 110], DIP: [20, 40, 60, 80, 100] },
  middle: { MCP: [20, 40, 60, 80, 100], PIP: [30, 50, 70, 90, 110], DIP: [20, 40, 60, 80, 100] },
  ring: { MCP: [20, 40, 60, 80, 100], PIP: [30, 50, 70, 90, 110], DIP: [20, 40, 60, 80, 100] },
  pinky: { MCP: [20, 40, 60, 80, 100], PIP: [30, 50, 70, 90, 110], DIP: [20, 40, 60, 80, 100] },
};

const jointNames = ['MCP', 'PIP', 'DIP'];
const FINGER_LABELS = ['thumb', 'index', 'middle', 'ring', 'pinky'];

// 每根手指對應一組顏色（同色系）
const fingerColors = {
  thumb: '#ff6384',   // 紅
  index: '#36a2eb',   // 藍
  middle: '#4bc0c0',  // 青
  ring: '#9966ff',    // 紫
  pinky: '#f6c026',   // 黃
};

export default function ROMAssessmentPanel({ landmarks , onDataUpdate}) {
  const [jointAngles, setJointAngles] = useState({});
  const [brunnstromStage, setBrunnstromStage] = useState(null);
  const [fuglScore, setFuglScore] = useState(0);
  const [history, setHistory] = useState([]);
  const [testing, setTesting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const { t } = useTranslation()

  // 根據 landmarks 計算每根手指的關節角度
  useEffect(() => {
      if (!landmarks || landmarks.length !== 21) {
       setJointAngles({});
       setBrunnstromStage(null);
        setFuglScore(0);
       return;
      }
    const pts = landmarks.map(pt => [pt.x * 540, pt.y * 310]);
    const data = {};

    const getAngle = (a, b, c) => {
      const v1 = [a[0] - b[0], a[1] - b[1]];
      const v2 = [c[0] - b[0], c[1] - b[1]];
      const dot = v1[0]*v2[0] + v1[1]*v2[1];
      const mag1 = Math.hypot(...v1);
      const mag2 = Math.hypot(...v2);
      const cosTheta = Math.min(Math.max(dot / (mag1 * mag2), -1), 1);
      return Math.acos(cosTheta) * (180 / Math.PI);
    };

    data.thumb = [getAngle(pts[0], pts[1], pts[2]), getAngle(pts[2], pts[3], pts[4])];
    data.index = [getAngle(pts[0], pts[5], pts[6]), getAngle(pts[5], pts[6], pts[7]), getAngle(pts[6], pts[7], pts[8])];
    data.middle = [getAngle(pts[0], pts[9], pts[10]), getAngle(pts[9], pts[10], pts[11]), getAngle(pts[10], pts[11], pts[12])];
    data.ring = [getAngle(pts[0], pts[13], pts[14]), getAngle(pts[13], pts[14], pts[15]), getAngle(pts[14], pts[15], pts[16])];
    data.pinky = [getAngle(pts[0], pts[17], pts[18]), getAngle(pts[17], pts[18], pts[19]), getAngle(pts[18], pts[19], pts[20])];

    setJointAngles(data);
    
    // 自動分級判斷條件
    const canExtendAll = ['index', 'middle', 'ring', 'pinky'].every(f => data[f]?.[1] < 20);
    const canMakeFist = ['index', 'middle', 'ring', 'pinky'].every(f => data[f]?.[0] > 70 && data[f]?.[1] > 90);

    // 計算 Brunnstrom 階段
let stage = 2;
if (canMakeFist && canExtendAll) stage = 5;
else if (canMakeFist) stage = 3;
else if (data.thumb?.[0] > 40 || data.index?.[0] > 40) stage = 4;

setBrunnstromStage(stage);
if (onDataUpdate) {
    onDataUpdate({
      angles: data,
      brunnstrom: stage,
      fugl: score,
      timestamp: Date.now(),
    });
  }
    let score = 0;
    if (canMakeFist) score += 2;
    if (canExtendAll) score += 2;
    if (data.thumb && data.index && data.thumb[1] > 40 && data.index[2] > 60) score += 2;
    if (data.index && data.index[1] > 60 && data.index[2] > 60) score += 2;

    setFuglScore(score);
    setHistory(prev => [...prev.slice(-29), { timestamp: Date.now(), data }]);
  }, [landmarks, testing]);

  // 根據角度與門檻回傳對應顏色
  const getJointColor = (finger, idx, angle) => {
    const joint = jointNames[idx] || (idx === 0 ? 'MCP' : 'IP');
    const thresholds = ROM_THRESHOLDS[finger][joint] || [0, 25, 50, 75, 100];
    if (angle >= thresholds[4]) return 'green';
    if (angle >= thresholds[3]) return 'limegreen';
    if (angle >= thresholds[2]) return 'orange';
    if (angle >= thresholds[1]) return 'darkorange';
    return 'red';
  };

  // 匯出目前關節角度為 CSV
  const exportCSV = () => {
    const rows = [['Finger', ...jointNames]];
    FINGER_LABELS.forEach(f => {
      const angles = jointAngles[f] || [];
      rows.push([f, ...angles.map(a => a.toFixed(0))]);
    });
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ROM_Assessment.csv';
    link.click();
  };

  // 啟動施測（8 秒）
  const startTesting = () => {
    setTesting(true);
    setBrunnstromStage(null);
    setFuglScore(0);
    let t = 8;
    setCountdown(t);
    const timer = setInterval(() => {
      t--;
      setCountdown(t);
      if (t <= 0) {
        clearInterval(timer);
        setTesting(false);
        setCountdown(null);
      }
    }, 1000);
  };

  // 折線圖資料，針對每個關節產生獨立線條（同手指同色）
  const chartData = {
    labels: history.map((_, i) => `#${i + 1}`),
    datasets: FINGER_LABELS.flatMap(finger =>
      (jointAngles[finger] || []).map((_, j) => ({
        label: `${finger} - ${jointNames[j] || 'IP'}`,
        data: history.map(h => h.data[finger]?.[j] || 0),
        borderColor: fingerColors[finger],
        backgroundColor: fingerColors[finger],
        tension: 0.2,
        pointRadius: 2,
        borderWidth: 2,
      }))
    ),
  };
  return (
    <div className="bg-white border p-3 rounded mt-3">
      <h5 className="text-center mb-3">🧠 {t('rom_title')}</h5>
  
      {(!landmarks || landmarks.length !== 21) && (
        <div className="alert alert-warning text-center py-1 mb-2">
          ⚠️ {t('rom_hand_not_detected')}
        </div>
      )}
  
      <div className="text-center mb-2">
        <button className="btn btn-primary btn-sm" onClick={startTesting} disabled={testing}>
          {t('rom_start')}
        </button>
  
        {countdown !== null && <p className="mt-2">{t('rom_countdown')}：{countdown}s</p>}
  
        <div className="mt-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => setShowLegend(p => !p)}>
            {showLegend ? t('rom_hide_legend') : t('rom_show_legend')}
          </button>
        </div>
  
        {showLegend && (
          <div className="text-start mt-2">
            <p><strong>🎨 {t('rom_color_legend')}：</strong></p>
            <ul className="small">
              <li style={{ color: 'green' }}>🟢 {t('rom_grade_excellent')}</li>
              <li style={{ color: 'limegreen' }}>🟩 {t('rom_grade_good')}</li>
              <li style={{ color: 'orange' }}>🟠 {t('rom_grade_fair')}</li>
              <li style={{ color: 'darkorange' }}>🟤 {t('rom_grade_borderline')}</li>
              <li style={{ color: 'red' }}>🔴 {t('rom_grade_poor')}</li>
            </ul>
          </div>
        )}
      </div>
  
      <table className="table table-sm table-bordered">
        <thead>
          <tr>
            <th>{t('rom_finger')}</th>
            {jointNames.map(j => (
              <th key={j}>{j}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FINGER_LABELS.map(finger => (
            <tr key={finger}>
              <td>{finger}</td>
              {(jointAngles[finger] || []).map((angle, i) => (
                <td key={i} style={{ color: getJointColor(finger, i, angle) }}>
                  {angle.toFixed(0)}°
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
  
      <div className="text-center">
        <p>
          <strong>{t('rom_brunnstrom')}：</strong>
          <span style={{ color: brunnstromStage >= 4 ? 'green' : 'orange' }}>
            {t('rom_stage')} {brunnstromStage ?? '?'}
          </span>
        </p>
        <p>
          <strong>{t('BBS: Sit TO Stand')}：</strong>
          <span style={{ color: fuglScore >= 10 ? 'green' : 'red' }}>
            {fuglScore} / 4
          </span>
        </p>
        <p>
          <strong>{t('BBS: Stand TO Sit')}：</strong>
          <span style={{ color: fuglScore >= 10 ? 'green' : 'red' }}>
            {brunnstromStage} / 4
          </span>
        </p>
        <p>
          <strong>{t('BBS: Stand Unsupported')}：</strong>
          <span style={{ color: fuglScore >= 10 ? 'green' : 'red' }}>
            {fuglScore} / 4
          </span>
        </p>
        <button className="btn btn-outline-secondary btn-sm" onClick={exportCSV}>
          {t('rom_download_csv')}
        </button>
      </div>
  
      {history.length >= 2 && (
        <div className="mt-4">
          <h6 className="text-center">📈 {t('rom_chart_title')}</h6>
          <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: true } } }} />
        </div>
      )}
    </div>
  );
}