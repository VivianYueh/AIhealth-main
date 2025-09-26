// src/components/ESGSection.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import AnimatedDonutChart from './AnimatedDonutChart'

export default function ESGSection() {
  const { t } = useTranslation()

  return (
    <section id="esg-section" className="py-5 bg-white border-top fade-up-section">
      <div className="container">
        <h2 className="fw-bold text-center mb-5">
          <i className="bi bi-globe2 me-2"></i> {t('esg_title')}
        </h2>
        <div className="row align-items-center mb-5">
          <div className="col-md-6 mb-4 mb-md-0 text-center">
            <AnimatedDonutChart value={16} max={30} size={150} />
            <div className="mt-3">
              <div className="fw-bold">{t('esg_usage_count')}</div>
              <div className="text-success fs-5">{t('esg_usage_times')}</div>
              <div className="text-muted">{t('esg_carbon_saved')}</div>
            </div>
            <div className="mt-3 text-muted small">
              <p>{t('esg_equivalent')}</p>
              <div className="d-flex justify-content-center gap-3 flex-wrap text-center">
                <div>
                  <div className="fs-1">🧃</div>
                  <div className="text-success fw-bold fs-5">{t('esg_cup_count')}</div>
                  <div className="fs-6">{t('esg_cup')}</div>
                </div>
                <div>
                  <div className="fs-1">🥤</div>
                  <div className="text-success fw-bold fs-5">{t('esg_straw_count')}</div>
                  <div className="fs-6">{t('esg_straw')}</div>
                </div>
                <div>
                  <div className="fs-1">🍽️</div>
                  <div className="text-success fw-bold fs-5">{t('esg_chopstick_count')}</div>
                  <div className="fs-6">{t('esg_chopstick')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="bg-light p-4 rounded shadow-sm fs-5">
              <h5 className="fw-bold mb-3">{t('esg_news_title')}</h5>
              <ul>
                <li>{t('esg_news_1')}</li>
                <li>{t('esg_news_2')}</li>
                <li>{t('esg_news_3')}</li>
                <li>{t('esg_news_4')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 圖片區塊：置於最下方，或你可選擇放在上方 */}
        <div className="text-center">
          <img
            src="/public/uploads/PicS3.jpg"
            alt="ESG 相關圖片"
            className="img-fluid rounded shadow-sm"
            style={{ maxHeight: '350px', objectFit: 'cover' }}
          />
        </div>
        <div className="text-center mb-4">
          <p className="fw-bold display-5 mb-0">{'MARKETING'}</p>
           <p className="fw-bold display-5 mb-0">{'HUANG GUAN HAO'}</p>
          </div>
      </div>
    </section>
  )
}

