// src/components/MobileNavModal.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import { handleSubscibe } from '../api'


export default function MobileNavModal({ user, handleNavigate, handleLogout, i18n, darkMode, setDarkMode }) {
  const { t } = useTranslation()

  return (
    <div className="modal fade" id="navModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-end">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('app_name')}</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body bg-light rounded-bottom px-3 pb-4">
            <div className="d-flex align-items-center mb-4">
              <i className="bi bi-person-circle fs-3 text-primary me-2"></i>
              <div>
                <div className="fw-bold">{user ? user.name : t('menu_guest')}</div>
                <div className="text-muted small">{user ? user.email : ''}</div>
              </div>
            </div>

            <div className="d-grid gap-3">
              <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => handleNavigate('/')}>
                <i className="bi bi-house-door"></i> {t('home')}
              </button>

              {user ? (
                <>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => handleNavigate('/user')}>
                    <i className="bi bi-person-badge"></i> {t('user_page')}
                  </button>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => handleNavigate('/interaction')}>
                    <i className="bi bi-hand-index-thumb"></i> {t('interaction_page')}
                  </button>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => handleNavigate('/therapist')}>
                    <i className="bi bi-clipboard-heart"></i> {t('therapist_page')}
                  </button>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => handleNavigate('/voice')}>
                     <i className="bi bi-mic"></i> {t('voice_assistant1')}
                  </button>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm"
                    variant="outline-primary"
                    onClick={() => handleSubscibe(user)}
                  >
                    {t('subscribe') || '訂閱'}
                  </button>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm"
                    variant="outline-primary"
                    onClick={() => alert('尚未開放，敬請期待！')}
                  >
                    {t('upload_questionnaire') || '上傳問卷'}
                  </button>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm"
                    variant="outline-primary"
                    onClick={() => alert('尚未開放，敬請期待！')}
                  >
                    {t('questionnaire') || '問卷'}
                  </button>
                  <button className="btn btn-outline-danger d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right"></i> {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => handleNavigate('/login')}>
                    <i className="bi bi-box-arrow-in-right"></i> {t('login')}
                  </button>
                  <button className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => handleNavigate('/register')}>
                    <i className="bi bi-pencil-square"></i> {t('register')}
                  </button>
                </>
              )}
              <hr className="my-3" />
{['zh', 'en', 'ja', 'nl'].map(lang => (
  <button
    key={lang}
    className="btn btn-light d-flex align-items-center gap-2 rounded-pill"
    onClick={() => i18n.changeLanguage(lang)}
  >
    <i className="bi bi-translate"></i>
    {t(
      lang === 'zh'
        ? 'language_zh'
        : lang === 'en'
        ? 'language_en'
        : lang === 'ja'
        ? 'language_ja'
        : lang === 'nl'
        ? 'language_nl'
        : lang
    )}
  </button>
))}


              
              <button
                className="btn btn-light d-flex align-items-center gap-2 rounded-pill"
                onClick={() => setDarkMode(prev => !prev)}
              >
                <i className="bi bi-moon-stars"></i> {darkMode ? t('light_mode') : t('dark_mode')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
