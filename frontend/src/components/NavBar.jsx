// src/components/NavBar.jsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NavBar({ handleNavigate, activeSection, setManualActiveSection }) {
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <nav className="navbar bg-white shadow-sm sticky-top">
      <div className="container-lg d-flex justify-content-between align-items-center">
        <button
          className="btn btn-link navbar-brand d-flex align-items-center fw-bold text-dark text-decoration-none"
          onClick={() => handleNavigate('/')}
          style={{ border: 'none', background: 'none', padding: 0 }}
        >
          <i className="bi bi-heart-pulse-fill text-danger me-2"></i>
          {t('app_name')}
        </button>

        {/* 桌機版導覽按鈕 */}
        <div className="d-none d-md-flex gap-3 align-items-center">
          {[
            { label: t('menu_about'), icon: 'bi-info-circle', path: '/', scrollTo: 'about-section' },
            { label: t('menu_feature'), icon: 'bi-cpu', path: '/', scrollTo: 'feature-section' },
            { label: t('menu_esg'), icon: 'bi-globe2', path: '/', scrollTo: 'esg-section' },
            { label: t('menu_contact'), icon: 'bi-envelope', path: '/', scrollTo: 'contact-section' },
          ].map(({ label, icon, path, scrollTo }) => (
            <button
              key={label}
              className={`btn rounded-pill shadow-sm px-4 py-2 transition-all duration-200 border-0 ${
                location.pathname === '/' && activeSection === scrollTo
                  ? 'bg-primary bg-opacity-75 text-white'
                  : 'bg-info bg-opacity-25 text-dark'
              }`}
              onClick={() => {
                setManualActiveSection(scrollTo)
                if (path === '/' && scrollTo) {
                  if (location.pathname !== '/') {
                    handleNavigate('/', { state: { scrollTo } })
                  } else {
                    document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' })
                  }
                } else {
                  handleNavigate(path)
                }
                setTimeout(() => setManualActiveSection(null), 2000)
              }}
            >
              <i className={`bi ${icon} me-1`}></i> {label}
            </button>
          ))}
        </div>

        {/* 手機版漢堡選單 */}
        <button
          className="btn btn-outline-dark rounded-circle"
          type="button"
          onClick={() => {
            document.querySelector('.modal-backdrop')?.remove()
            document.body.classList.remove('modal-open')
            document.body.style = ''
            const modalEl = document.getElementById('navModal')
            if (modalEl) window.bsNavModal = bootstrap.Modal.getOrCreateInstance(modalEl)
            window.bsNavModal?.show()
          }}
        >
          <i className="bi bi-list fs-4"></i>
        </button>
      </div>
    </nav>
  )
}
