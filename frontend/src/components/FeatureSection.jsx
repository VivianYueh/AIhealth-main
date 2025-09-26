// src/components/FeatureSection.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function FeatureSection() {
  const { t } = useTranslation()

  const features = [
    {
      title: t('feature_ai'),
      desc: t('feature_ai_desc')
    },
    {
      title: t('feature_gamified'),
      desc: t('feature_gamified_desc')
    },
    {
      title: t('feature_cloud'),
      desc: t('feature_cloud_desc')
    },
    {
      title: t('feature_remote'),
      desc: t('feature_remote_desc')
    }
  ]

  return (
    <section id="feature-section" className="py-5 bg-light fade-up-section">
      <div className="container">
        <h2 className="fw-bold text-center mb-4">
          <i className="bi bi-stars me-2"></i> {t('menu_feature')}
        </h2>
        <div className="row text-center">
          {features.map((f, i) => (
            <div className="col-md-3 mb-4" key={i}>
              <div className="p-4 bg-white border rounded shadow-sm h-100">
                <h5 className="fw-bold">{f.title}</h5>
                <p className="text-muted small">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
