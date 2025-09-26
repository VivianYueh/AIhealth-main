import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-firebase-hooks/auth'
import { auth } from '../firebase/config'
import { getLatestRehabData, saveRehabData } from '../api'
import ROMAssessmentPanel from './ROMAssessmentPanel'

export default function RehabDashboard() {
  const { t } = useTranslation()
  const [user] = useAuth(auth)
  const [latestROM, setLatestROM] = useState(null)
  // const [landmarks, setLandmarks] = useState(null); // TODO: 未來實現 MediaPipe 21 點手部資料

  useEffect(() => {
    if (user) {
      getLatestRehabData(user.uid).then((data) => {
        if (data) {
          setLatestROM(data)
        }
      })
    }
  }, [user])

  const handleROMUpdate = async (data) => {
    if (user) {
      const rehabData = {
        ...data,
        timestamp: new Date().toISOString()
      }
      await saveRehabData(user.uid, rehabData)
      setLatestROM(rehabData)
    }
  }

  return (
    <div className="container mt-4">
      <h4 className="mb-3">🧪 {t('dashboard_title')}</h4>

      {latestROM ? (
        <div className="alert alert-light border mb-4">
          <p><strong>🕒 {t('updated_at')}：</strong>{new Date(latestROM.timestamp).toLocaleString('zh-TW')}</p>
          <p><strong>{t('brunnstrom_stage')}：</strong>{latestROM.brunnstrom}</p>
          <p><strong>{t('fugl_meyer_score')}：</strong>{latestROM.fugl} / 14</p>
          <p><strong>{t('thumb_mcp')}：</strong>{latestROM.angles?.thumb?.[0]?.toFixed(0)}°</p>
          <p><strong>{t('index_dip')}：</strong>{latestROM.angles?.index?.[2]?.toFixed(0)}°</p>
        </div>
      ) : (
        <p className="text-muted">{t('no_data')}</p>
      )}

      <ROMAssessmentPanel
        landmarks={null} // TODO: 傳入 MediaPipe 的 21 點手部資料
        onDataUpdate={handleROMUpdate} // 傳入更新函數
      />
    </div>
  )
}