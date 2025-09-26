import { Link } from 'react-router-dom'
import { useState } from 'react'
import VoiceAssistant from './VoiceAssistant'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'

export default function GuestPage() {
  const [showAssistant, setShowAssistant] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">{t('guest_page') || 'Guest 體驗專區'}</h2>
      <h5 className="mb-4 text-center text-muted">
        {t('welcome_guest') || '歡迎以訪客身份體驗系統功能，部分資料將不被記錄。'}
      </h5>

      <h5 className="mb-3">{t('available_tests') || '可體驗測驗'}</h5>
      <ul className="list-group mb-5">
        {[
          { name: t('balance_test') || '平衡測驗', route: '/interaction' },
          { name: t('wave_recognition') || '揮手辨識', route: '/interaction' },
        ].map((item, i) => (
          <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
            {item.name}
            <Link to={item.route} className="btn btn-outline-primary btn-sm rounded-pill">
              {t('try_now') || '立即體驗'}
            </Link>
          </li>
        ))}
      </ul>

      <h5 className="mb-3">{t('guest_history') || '測驗範例紀錄'}</h5>
      <div className="mb-2 text-muted">
        {t('guest_history_tip') || '訪客模式僅供展示，不會保存個人紀錄。'}
      </div>
      <ul className="list-group mb-4">
        {[
          { name: 'Demo 測驗 A', disabled: true },
          { name: 'Demo 測驗 B', disabled: true },
        ].map((item, i) => (
          <li
            key={i}
            className="list-group-item d-flex justify-content-between align-items-center"
            style={item.disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}
          >
            {item.name}
            <button
              className="btn btn-outline-secondary btn-sm rounded-pill"
              disabled
            >
              {t('view_record') || '僅限註冊會員'}
            </button>
          </li>
        ))}
      </ul>

      <div className="text-center mb-3">
        <Link to="/register" className="btn btn-success rounded-pill px-4 py-2">
          {t('register_to_save') || '註冊帳號以保存記錄'}
        </Link>
      </div>

      {/* 語音助理按鈕 */}
      <div className="text-center mb-3">
        <button
          className="btn btn-outline-dark rounded-pill d-flex align-items-center justify-content-center gap-2"
          onClick={() => setShowAssistant(prev => !prev)}
        >
          <FontAwesomeIcon icon={showAssistant ? faMicrophoneSlash : faMicrophone} />
          {showAssistant
            ? t('close_voice_assistant') || '關閉語音助理'
            : t('open_voice_assistant') || '開啟語音助理'}
        </button>
      </div>

      {/* 語音助理 UI */}
      {showAssistant && (
        <div className="border rounded p-3 bg-light">
          <VoiceAssistant />
        </div>
      )}
    </div>
  )
}

