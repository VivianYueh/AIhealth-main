// src/components/BannerCarousel.jsx
import React from 'react'
import { Carousel } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

export default function BannerCarousel() {
  const { t } = useTranslation()

  return (
    <section className="bg-white border-top py-4">
      <div className="container">
        <Carousel className="rounded shadow-sm">
          <Carousel.Item>
            <img
              src="\public\uploads\NOVA2.jpg"
              className="d-block w-100 rounded"
              alt={t('carousel_img1_alt')}
              style={{ objectFit: 'cover', height: '400px' }}
            />
          </Carousel.Item>
          <Carousel.Item>
            <img
              src="\public\uploads\PicS1.png"
              className="d-block w-100 rounded"
              alt={t('carousel_img2_alt')}
              style={{ objectFit: 'cover', height: '400px' }}
            />
          </Carousel.Item>
          <Carousel.Item>
            <img
              src="\public\uploads\PicC3.jpg"
              className="d-block w-100 rounded"
              alt={t('carousel_img3_alt')}
              style={{ objectFit: 'cover', height: '400px' }}
            />
          </Carousel.Item>
        </Carousel>
      </div>
    </section>
  )
}