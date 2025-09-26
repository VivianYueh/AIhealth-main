import React, { useState, useRef, useEffect } from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';


const AnimatedDonutChart = ({ value = 16, max = 30, size = 120 }) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const ref = useRef(null);

  // 數值動畫
  const animatedValue = useAnimatedNumber(shouldAnimate ? value : 0, 2000, shouldAnimate);

  // 圓形圖計算
  const radius = (size / 2) - 6;
  const dashArray = 2 * Math.PI * radius;
  const percent = Math.min(animatedValue / max, 1);
  const dashOffset = dashArray * (1 - percent);

  // 滾動進畫面時觸發動畫
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          triggerAnimation();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // 滑入或捲動到時都能重播動畫
  const triggerAnimation = () => {
    setShouldAnimate(false);
    setTimeout(() => setShouldAnimate(true), 50);
  };

  return (
    <div
      ref={ref}
      className={`position-relative d-inline-block scale-fade-in ${shouldAnimate ? 'active' : ''}`}
      onMouseEnter={triggerAnimation}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        {/* 背景圓 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e6e6e6"
          strokeWidth="12"
          fill="none"
        />
        {/* 前景圓環動畫 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#5cb85c"
          strokeWidth="12"
          fill="none"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 2s ease' }}
        />
      </svg>

      {/* 中間數值 */}
      <div className="position-absolute top-50 start-50 translate-middle text-center">
        <div className="fs-4 fw-bold">{animatedValue}</div>
        <div className="text-muted small">公克 碳排量<br />(g/co2e)</div>
      </div>
    </div>
  );
};

export default AnimatedDonutChart;
