// src/components/HeroSection.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'   // ← 引入 useNavigate

export default function HeroSection({ handleGuestLogin }) {
  const { t } = useTranslation()
  const navigate = useNavigate()                       // ← 建立 navigate
const handleGoGuestPage = () => {
    // ⚠️ 如果此處不需要任何額外邏輯，可以直接 navigate
    navigate('/guest')
  }
  return (
    <section className="bg-teal-light py-5 text-center">
      <div className="container">
        <h1 className="hero-title mb-3 display-3 fw-bold">N O V A T E R A</h1>
        <h1 className="hero-title mb-3 display-4 fw-bold">{t('hero_slogan')}</h1>
        <p className="hero-subtitle lead mb-4">
          {t('hero_description')}
        </p>

        <div className="d-grid gap-2 d-sm-flex justify-content-center">
          
          <Link
  to="/guest"
  className="btn btn-teal btn-lg rounded-pill px-4 shadow-sm"
>
  {t('hero_login')}
</Link>

        </div>
      </div>
    </section>
  )
}
