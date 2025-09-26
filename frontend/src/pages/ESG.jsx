import ESGSection from '../components/ESGSection'
import { useTranslation } from 'react-i18next'

export default function ESG() {
  const { t } = useTranslation()

  return (
    <>
      <div className="container py-5">
        <h1 className="mb-4">{t('esg_title')}</h1>
        <p>{t('esg_intro')}</p>
        <ul>
          <li>{t('esg_point_1')}</li>
          <li>{t('esg_point_2')}</li>
          <li>{t('esg_point_3')}</li>
        </ul>
      </div>

      <ESGSection />
    </>
  )
}
