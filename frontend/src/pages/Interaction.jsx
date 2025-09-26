import React, { useState } from 'react'
import { useLocation } from 'react-router-dom';
import { Hand, ActivitySquare, X } from 'lucide-react'
import HandGestureRecorder from './HandGestureRecorder'
import BodyPoseRecorder from './BodyPoseRecorder'       // ① 引入
import { useTranslation } from 'react-i18next'

export default function Interaction() {
  const location = useLocation();
  const { t } = useTranslation()
  const [showGestureComponent, setShowGestureComponent] = useState(false)
  const [showBodyComponent, setShowBodyComponent] = useState(false)   // ② 狀態

  // --- handlers ----------------------------------------------------
  const handleGestureClick = () => {
    setShowGestureComponent(true)
    setShowBodyComponent(false)    // 關掉另一個
  }

  const handleBodyClick = () => {
    setShowBodyComponent(true)
    setShowGestureComponent(false)
  }

  const handleCloseAll = () => {
    setShowGestureComponent(false)
    setShowBodyComponent(false)
  }
  // ----------------------------------------------------------------

  // 取得user資訊（若有）
  const user = location.state?.user;
  const taskId = location.state?.taskId;  // 取得 taskId
  const role = location.state?.role;      // 取得 role
  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">{t('interaction_title')}</h2>

      <div className="row">
        <div className="col-md-6 mb-3">
          <button
            onClick={handleGestureClick}
            className="interaction-btn p-3 border bg-light text-center rounded shadow-sm w-100 d-flex align-items-center justify-content-center"
            title={t('open_gesture_recognition')}
          >
            <Hand className="me-2" />
            {t('gesture_area')}
          </button>
        </div>

        <div className="col-md-6 mb-3">
          <button
            onClick={handleBodyClick}
            className="interaction-btn p-3 border bg-light text-center rounded shadow-sm w-100 d-flex align-items-center justify-content-center"
             // 建議把原先 _alert_ key 改成 open
            title={t('body_recognition_open')}  
          >
            <ActivitySquare className="me-2" />
            {t('body_area')}
          </button>
        </div>
      </div>

      {/* ---- 動態區域：手勢 / 肢體 二擇一 ---- */}
      {(showGestureComponent || showBodyComponent) && (
        <div className="position-relative border rounded shadow mb-4">
          <button
            onClick={handleCloseAll}
            className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
            title={t('close_recognition')}
          >
            <X size={16} />
          </button>

          {showGestureComponent && <HandGestureRecorder user={user} taskId={taskId} role={role} />}
          {showBodyComponent && <BodyPoseRecorder user={user}taskId={taskId}role={role} />}   {/* 傳遞user */}
        </div>
      )}

      <p className="text-muted mt-3 text-center">
        {t('auto_check_hint')}
      </p>

      <style>{`
        .interaction-btn:hover {
          background-color: #e2f0ff;
          transition: background-color 0.3s ease;
        }
      `}</style>
    </div>
  )
}
