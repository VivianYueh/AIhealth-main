import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <>
      {/* 聯絡我們區塊 */}
      <section id="contact-section" className="py-5 bg-light border-top fade-up-section">
        <div className="container">
          <h2 className="fw-bold text-center mb-4">
            <i className="bi bi-envelope me-2"></i>{t('contact_section_title')}
          </h2>
          <p className="text-muted text-center mb-4">{t('contact_description')}</p>
          <div className="row justify-content-center text-center fs-5">
            <div className="col-md-6">
              <ul className="list-unstyled">
                <li className="mb-2">
                  <i className="bi bi-envelope-fill me-2 text-primary"></i>
                  <strong>{t('contact_email')}：</strong> teamgrown2025@gmail.com
                </li>
                <li className="mb-2">
                  <i className="bi bi-telephone-fill me-2 text-primary"></i>
                  <strong>{t('contact_phone')}：</strong> (09) 8788-2100
                </li>
                <li>
                  <i className="bi bi-geo-alt-fill me-2 text-primary"></i>
                  <strong>{t('contact_address')}：</strong> 新北市新莊區中正路510號信義和平
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 頁腳版權與快速連結 */}
      <footer className="bg-light text-center text-muted py-4 border-top">
        <div className="container">
          <p className="mb-1">
            &copy; {new Date().getFullYear()} {t('app_name')}. {t('footer_rights')}
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/about" className="text-muted text-decoration-none">{t('menu_about')}</Link>
            <Link to="/product" className="text-muted text-decoration-none">{t('menu_feature2')}</Link>
            <Link to="/contact" className="text-muted text-decoration-none">{t('menu_contact')}</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
