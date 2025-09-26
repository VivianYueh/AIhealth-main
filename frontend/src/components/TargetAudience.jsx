// src/components/TargetAudience.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function TargetAudience() {
  const { t } = useTranslation()

  const audienceList = [
    t('audience_stroke'),
    t('audience_clinic'),
    t('audience_homecare'),
    t('audience_nursing')
  ]

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <h2 className="fw-bold text-center mb-5">
          <i className="bi bi-people me-2"></i>{t('target_audience')}
        </h2>
        <div className="row text-center">
          {audienceList.map((group, i) => (
            <div className="col-md-3 mb-3" key={i}>
              <div className="p-4 bg-white border rounded shadow-sm h-100">{group}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
