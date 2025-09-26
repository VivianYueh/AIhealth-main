// src/components/ProductIntro.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function ProductIntro() {
  const { t } = useTranslation()

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-6 mb-3 mb-md-0">
            <h2 className="fw-bold mb-3">
              <i className="bi bi-cpu me-2"></i> {t('product_intro_title')}
            </h2>
            <p className="text-muted">{t('product_intro_description')}</p>
          </div>
          <div className="col-md-6">
            <div className="bg-white p-5 border rounded shadow-sm text-center">
              <img
                src="\public\uploads\Product.png"
                className="d-block w-100 rounded"
                alt="產品圖"
                style={{ objectFit: 'cover', height: '300px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
