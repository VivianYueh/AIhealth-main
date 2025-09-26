import React from 'react'
import { useTranslation } from 'react-i18next'

export default function MarketPosition() {
  const { t } = useTranslation()

  return (
    <section className="py-5">
      <div className="container">
        <h2 className="fw-bold text-center mb-4">
          <i className="bi bi-bullseye me-2"></i> {t('market_section_title')}
        </h2>
        <div className="row justify-content-center">
          <div className="col-md-8">
            <ul className="list-group list-group-flush">
              <li className="list-group-item">
                <strong>{t('market_position_label')}</strong> {t('market_position_text')}
              </li>
              <li className="list-group-item">
                <strong>{t('market_value_label')}</strong> {t('market_value_text')}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
