import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Hand, ActivitySquare, X } from 'lucide-react';
import VoiceAssistant from './VoiceAssistant'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import HandGestureRecorder from './HandGestureRecorder';
import BodyPoseRecorder from './BodyPoseRecorder';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons'

/**
 * Guest‑only demo page (JavaScript version).
 */
export default function GuestPage() {
    const [showAssistant, setShowAssistant] = useState(false)
  const { t } = useTranslation();

  const [showGestureComponent, setShowGestureComponent] = useState(false);
  const [showBodyComponent, setShowBodyComponent] = useState(false);

  // Retrieve visitor alias (fallback to "GUEST")
  const guestName = localStorage.getItem('userName') ?? 'GUEST';

  // --- handlers --------------------------------------------------
  const handleGestureClick = () => {
    setShowGestureComponent(true);
    setShowBodyComponent(false);
  };

  const handleBodyClick = () => {
    setShowBodyComponent(true);
    setShowGestureComponent(false);
  };

  const handleCloseAll = () => {
    setShowGestureComponent(false);
    setShowBodyComponent(false);
  };
  // ---------------------------------------------------------------

  return (
    <div className="container py-5">
      {/* Welcome block */}
      <div className="text-center mb-5">
        <h2 className="fw-bold mb-2">{t('guest_welcome', { name: guestName })}</h2>
         {/* Welcome block<p className="lead text-muted">{t('guest_desc')}</p> */}
      </div>

      {/* Feature list 
      <div className="mb-4">
        <h4 className="mb-3">{t('guest_functions')}</h4>
        <ul className="list-group mb-4">
          <li className="list-group-item">{t('guest_function_1')}</li>
          <li className="list-group-item">{t('guest_function_2')}</li>
          <li className="list-group-item text-muted">{t('guest_only_demo')}</li>
        </ul>
      </div>*/}

      {/* Interaction launcher */}
      <h4 className="mb-3 text-center">{t('interaction_title')}</h4>

      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <button
            onClick={handleGestureClick}
            className="interaction-btn p-3 border bg-light text-center rounded shadow-sm w-100 d-flex align-items-center justify-content-center"
            title={t('open_gesture_recognition')}
          >
            <Hand className="me-2" />
            {t('gesture_area')}
          </button>
        </div>

        <div className="col-md-6 mb-3">
          <button
            onClick={handleBodyClick}
            className="interaction-btn p-3 border bg-light text-center rounded shadow-sm w-100 d-flex align-items-center justify-content-center"
            title={t('body_recognition_open')}
          >
            <ActivitySquare className="me-2" />
            {t('body_area')}
          </button>
        </div>
      </div>

      {/* Dynamic area: show one recorder at a time */}
      {(showGestureComponent || showBodyComponent) && (
        <div className="position-relative border rounded shadow mb-4">
          <button
            onClick={handleCloseAll}
            className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
            title={t('close_recognition')}
          >
            <X size={16} />
          </button>

          {showGestureComponent && <HandGestureRecorder />}
          {showBodyComponent && <BodyPoseRecorder />}
        </div>
      )}
{/* 語音助理按鈕 */}
      <div className="text-center mb-3">
        <button
          className="btn btn-outline-dark rounded-pill d-flex align-items-center justify-content-center gap-2"
          onClick={() => setShowAssistant(prev => !prev)}
        >
          <FontAwesomeIcon icon={showAssistant ? faMicrophoneSlash : faMicrophone} />
          {showAssistant
            ? t('close_voice_assistant') || '關閉語音助理'
            : t('open_voice_assistant') || '開啟語音助理'}
        </button>
      </div>
      {/*<p className="text-muted mt-3 text-center">{t('auto_check_hint')}</p> 語音助理按鈕 */}

      <div className="text-center">
        <Link to="/" className="btn btn-outline-primary rounded-pill px-4">
          {t('back_to_home')}
        </Link>
      </div>


      {/* 語音助理 UI */}
      {showAssistant && (
        <div className="border rounded p-3 bg-light">
          <VoiceAssistant />
        </div>
      )}
      {/* Local hover effect */}
      <style jsx>{`
        .interaction-btn:hover {
          background-color: #e2f0ff;
          transition: background-color 0.3s ease;
        }
      `}</style>
    </div>
  );
}
