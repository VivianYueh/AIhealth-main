import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import './Home.css';
import ESGSection from '../components/ESGSection'
import HeroSection from '../components/HeroSection'
import BannerCarousel from '../components/BannerCarousel'
import MarketPosition from '../components/MarketPosition'
import TargetAudience from '../components/TargetAudience'
import FeatureSection from '../components/FeatureSection'
import ProductIntro from '../components/ProductIntro'
import TeamSection from '../components/TeamSection'
import Teamsection2 from '../components/Teamsection2'
import { useTranslation } from 'react-i18next'


export default function Home() {
  const location = useLocation();
  const { t } = useTranslation()

  // 手動登入（訪客身份）
  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
      }
    }
  }, [location]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('active', entry.isIntersecting);
        });
      },
      { threshold: 0.3 }
    );

    const elements = document.querySelectorAll('.fade-up-section');
    elements.forEach(el => {
      el.classList.remove('active');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div>
      {/* Hero 區 */}
      <HeroSection/>

      {/* 輪播圖 */}
      <BannerCarousel />

      {/* 產品簡介 */}
      <ProductIntro />

      {/* 關於我們 */}
    <section id="about-section" className="py-5 bg-white border-top fade-up-section">
      <div className="container">
        <h2 className="fw-bold text-center mb-4">
          <i className="bi bi-info-circle me-2"></i> {t('about_title')}
        </h2>
        <div className="row justify-content-center">
          <div className="col-md-10">
            <p className="text-muted lead">{t('about_para_1')}</p>
            <p className="text-muted">{t('about_para_2')}</p>
            <p className="text-muted">{t('about_para_3')}</p>
          </div>
          <div className="text-center mb-4">
           <p className="fw-bold display-5 mb-0">{'CHECK OUR IG'}</p>
          </div>

        </div>
        {/* 重要圖片鏈結 */}
        <div className="col-md-6 mb-4 mb-md-0 d-flex gap-3">

            <img
              src="\public\uploads\IGqrcode.jpg"
              alt="關於我們圖片"
              className="img-fluid rounded shadow-sm"
              style={{ objectFit: 'cover', maxHeight: '350px', width: '50%' }}
            /> 
            {/*<img
              src="\public\uploads\PicS1.png"
              alt="關於我們圖片"
              className="img-fluid rounded shadow-sm"
              style={{ objectFit: 'cover', maxHeight: '350px', width: '50%'  }}
            />*/}
            <img
              src="\public\uploads\Ignova.png"
              alt="關於我們IG圖片"
              className="img-fluid rounded shadow-sm"
              style={{ objectFit: 'cover', maxHeight: '650px', width: '50%'  }}
            />
          </div>
          
          <div className="col-md-6 mb-4 mb-md-0">
          {/*<div className="text-center mb-4">
           <p className="fw-bold display-5 mb-0">{'施淞礬'}</p>
          </div>*/}
        
           
          </div>
      </div>
    </section>

      {/* 產品特色 */}
      <FeatureSection />

      {/* 目標族群 */}
      <TargetAudience />

      {/* 市場定位 */}
      <MarketPosition />

      {/* 成員介紹 */}
      <TeamSection />
<Teamsection2 />
      {/* ESG */}
      <ESGSection />
      

    </div>
  );
}
