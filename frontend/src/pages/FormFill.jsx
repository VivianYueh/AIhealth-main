// FormFill.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { submitForm, uploadMedia } from '../api';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Button, Form, Alert, Container } from 'react-bootstrap';

export default function FormFill({ user }) {
  const { t } = useTranslation();
  const { formId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [responses, setResponses] = useState({});
  const [mediaFiles, setMediaFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 獲取表單數據
  useEffect(() => {
    const fetchForm = async () => {
      setLoading(true);
      try {
        const formDoc = await getDoc(doc(db, 'formAssigned', formId));
        if (!formDoc.exists()) {
          throw new Error('表單不存在');
        }
        setFormData(formDoc.data());
      } catch (err) {
        console.error('Error fetching form:', err.message);
        setError(t('error_fetch_form') || `無法載入表單: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [formId, t]);

  // 處理輸入變化
  const handleInputChange = (questionId, value) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // 處理多選題變化
  const handleCheckboxChange = (questionId, option, checked) => {
    setResponses((prev) => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter((item) => item !== option) };
      }
    });
  };

  // 處理檔案上傳
  const handleFileChange = (questionId, files) => {
    setMediaFiles((prev) => ({
      ...prev,
      [questionId]: files,
    }));
  };

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const mediaUrls = {};
      // 上傳所有檔案
      for (const questionId in mediaFiles) {
        const files = mediaFiles[questionId];
        if (files && files.length > 0) {
          const urls = await Promise.all(
            Array.from(files).map((file) => uploadMedia(file, user.uid))
          );
          mediaUrls[questionId] = urls;
        }
      }
      // 合併答案和媒體 URL
      const finalResponses = { ...responses, media: mediaUrls };
      await submitForm(formId, finalResponses, user.uid);
      navigate('/patient');
    } catch (err) {
      console.error('Error submitting form:', err.message);
      setError(t('error_submit_form') || `提交表單失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center p-5">
        <FontAwesomeIcon icon={faSpinner} spin /> {t('loading') || '載入中...'}
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (!formData) {
    return (
      <Container>
        <Alert variant="info">{t('no_form_data') || '無表單資料'}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">{formData.title}</h2>
      <Form onSubmit={handleSubmit}>
        {formData.questions.map((q) => (
          <Form.Group key={q.id} className="mb-3">
            <Form.Label>{q.question}</Form.Label>
            {q.type === 'radio' && (
              <div>
                {q.options.map((option, index) => (
                  <Form.Check
                    key={index}
                    type="radio"
                    name={q.id}
                    label={option}
                    value={option}
                    checked={responses[q.id] === option}
                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                  />
                ))}
              </div>
            )}
            {q.type === 'checkbox' && (
              <div>
                {q.options.map((option, index) => (
                  <Form.Check
                    key={index}
                    type="checkbox"
                    label={option}
                    value={option}
                    checked={(responses[q.id] || []).includes(option)}
                    onChange={(e) =>
                      handleCheckboxChange(q.id, option, e.target.checked)
                    }
                  />
                ))}
              </div>
            )}
            {q.type === 'text' && (
              <Form.Control
                as={q.isLongText ? 'textarea' : 'input'}
                rows={q.isLongText ? 4 : 1}
                value={responses[q.id] || ''}
                onChange={(e) => handleInputChange(q.id, e.target.value)}
              />
            )}
            {q.type === 'file' && (
              <Form.Control
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(q.id, e.target.files)}
              />
            )}
          </Form.Group>
        ))}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />{' '}
              {t('submitting') || '提交中...'}
            </>
          ) : (
            t('submit') || '提交'
          )}
        </Button>
      </Form>
    </Container>
  );
}