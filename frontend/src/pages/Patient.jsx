import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { submitForm, submitTaskMedia, uploadMedia, addDailyRecord } from '../api';
import VoiceAssistant from './VoiceAssistant';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faInfoCircle, faUpload, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Modal, Button, Form, Alert, Container } from 'react-bootstrap';

export default function Patient({ user }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formData, setFormData] = useState(null);
  const [responses, setResponses] = useState({});
  const [mediaFiles, setMediaFiles] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.uid) {
      setError(t('please_login') || '請先登入');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'patient') {
          throw new Error(t('invalid_role') || '用戶無個案角色或文檔不存在');
        }
        console.log('User role:', userDoc.data().role);

        const taskQuery = query(collection(db, 'tasks'), where('patient_id', '==', user.uid));
        const taskSnapshot = await getDocs(taskQuery);
        console.log('Task query result - empty:', taskSnapshot.empty, 'docs:', taskSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
        if (taskSnapshot.empty) {
          console.log('No tasks found for patient:', user.uid);
        } else {
          const taskList = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTasks(taskList);
        }

        const formQuery = query(collection(db, 'formAssigned'), where('assigned_to', '==', user.uid));
        const formSnapshot = await getDocs(formQuery);
        console.log('Form query result - empty:', formSnapshot.empty, 'docs:', formSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
        if (formSnapshot.empty) {
          console.log('No forms found for patient:', user.uid);
        } else {
          const formList = formSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setForms(formList);
        }
        if (!taskSnapshot.empty || !formSnapshot.empty) {
          alert('還有任務或表單未完成，請盡快處理！');
        }
      } catch (err) {
        console.error('Error fetching data:', err.message, err.code);
        if (err.code === 'permission-denied') {
          setError(t('permission_denied') || '無權限存取資料，請確認任務或表單分配及權限設定，或聯繫管理員');
        } else if (err.code === 'unavailable') {
          setError(t('network_error') || '無法連線到伺服器，請檢查網路');
        } else if (err.code === 'invalid-argument') {
          setError(t('invalid_query') || '查詢參數無效，請聯繫管理員');
        } else {
          setError(t('load_data_error') || `無法載入資料: ${err.message} (代碼: ${err.code || '無'})`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, t]);

  const handlePerformTask = async (taskId) => {
    setLoading(true);
    try {
      await updateTaskProgress(taskId, 100);
      // 傳遞user資訊到/interaction
      navigate('/interaction', {
        state: {
          user: {
            uid: user?.uid,
            name: user?.displayName || user?.name || '',
            email: user?.email || ''
          },
          taskId,
          role: user?.role || 'patient'
        }
      });
    } catch (err) {
      console.error('Error performing task:', err.message);
      setError('執行任務失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskProgress = async (taskId, progress) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'tasks', taskId), { progress });
      setTasks(tasks.map(task => task.id === taskId ? { ...task, progress } : task));
    } catch (err) {
      console.error('Error updating task:', err.message, err.code);
      setError(t('update_task_error') || '更新任務失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleFileUpload = async (e, taskId) => {
    const files = e.target.files;
    if (files.length > 0) {
      setLoading(true);
      try {
        console.log('Selected files for task:', taskId, files);
        const mediaUrls = await submitTaskMedia(taskId, user.uid, files, user.role);
        setTasks(tasks.map(task => task.id === taskId ? { ...task, media: [...(task.media || []), ...mediaUrls] } : task));

        await updateTaskProgress(taskId, 100);

      } catch (err) {
        console.error('Error uploading task media:', err.message);
        setError(t('upload_task_media_error') || `上傳任務媒體失敗: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDailyRecordUpload = async (e) => {
    const files = e.target.files;
    if (files.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const uploadPromises = Array.from(files).map(file =>
        uploadMedia(file, user.uid, 'daily_record', 'DailyRecord', user.role)
      );

      const mediaUrls = await Promise.all(uploadPromises);

      const recordPromises = mediaUrls.map(url =>
        addDailyRecord(user.uid, url, user.role)
      );
      await Promise.all(recordPromises);

      alert(t('upload_success') || '記錄上傳成功！');
    } catch (err) {
      console.error('Error uploading daily record:', err.message);
      setError(t('upload_error') || `上傳記錄失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDailyRecordClick = () => {
    fileInputRef.current.click();
  };

  const handleFormClick = async (form) => {
    setSelectedForm(form);
    setLoading(true);
    setError(null);
    try {
      const formDoc = await getDoc(doc(db, 'formAssigned', form.id));
      if (!formDoc.exists()) {
        throw new Error(t('form_not_found') || '表單不存在');
      }
      const formData = form.formQuestion;

      const poseQuestion = formData.questions.find(q => q.type === 'pose_detection');
      if (poseQuestion) {
        // 如果表單有姿勢偵測問題，導航到互動頁面並傳遞參數
        navigate('/interaction', {
          state: {
            taskType: 'pose_detection',
            formId: form.id,
            targetAction: poseQuestion.target_action,
            repsRequired: poseQuestion.reps_required
          }
        });
        return;
      }

      // 如果沒有姿勢偵測問題，則顯示一般表單
      setFormData(formData);
      setShowFormModal(true);
    } catch (err) {
      console.error('Error fetching form:', err.message, err.code);
      setError(t('error_fetch_form') || `無法載入表單: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionText, value) => {
    setResponses((prev) => ({
      ...prev,
      [questionText]: value,
    }));
    setValidationErrors((prev) => ({
      ...prev,
      [questionText]: null,
    }));
  };

  const handleCheckboxChange = (questionText, option, checked) => {
    setResponses((prev) => {
      const current = prev[questionText] || [];
      if (checked) {
        return { ...prev, [questionText]: [...current, option] };
      } else {
        return { ...prev, [questionText]: current.filter((item) => item !== option) };
      }
    });
    setValidationErrors((prev) => ({
      ...prev,
      [questionText]: null,
    }));
  };

  const handleFileChange = (questionText, files) => {
    setMediaFiles((prev) => ({
      ...prev,
      [questionText]: files,
    }));
    setValidationErrors((prev) => ({
      ...prev,
      [questionText]: null,
    }));
  };

  const validateForm = () => {
    const errors = {};
    formData.questions.forEach((q) => {
      if (q.required) {
        if (q.type === 'media_upload') {
          // 檢查 mediaFiles
          if (!mediaFiles[q.text] || mediaFiles[q.text].length === 0) {
            errors[q.text] = t('required_field') || '此問題為必填';
          }
        } else {
          if (!responses[q.text] || (Array.isArray(responses[q.text]) && responses[q.text].length === 0)) {
            errors[q.text] = t('required_field') || '此問題為必填';
          }
        }
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('User UID:', user.uid, 'Form ID:', selectedForm.id, 'Assigned To:', selectedForm.assigned_to);
      await submitForm(selectedForm.id, responses, user.uid, mediaFiles, user.role);
      await updateDoc(doc(db, 'formAssigned', selectedForm.id), {
        completed: true
      }).catch(err => {
        console.error('Error updating form status:', err.message, err.code);
        throw err;
      });
      setForms(forms.map(form => form.id === selectedForm.id ? { ...form, completed: true, status: 'completed' } : form));
      setShowFormModal(false);
      setResponses({});
      setMediaFiles({});
      setFormData(null);
      setValidationErrors({});
    } catch (err) {
      console.error('Error submitting form:', err.message, err.code);
      setError(t('error_submit_form') || `提交表單失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4 text-center">{t('patient_dashboard') || '個案儀表板'}</h2>
      {loading && <div className="text-center p-5"><FontAwesomeIcon icon={faSpinner} spin /> {t('loading') || '載入中...'}</div>}
      {error && <Alert variant="danger" className="text-center">{error}</Alert>}

      {user ? (
        <>
          <h5 className="mb-3">{t('rehab_tasks') || '復健任務'}</h5>
          {tasks.length === 0 && !loading && (
            <Alert variant="info" className="text-center">{t('no_tasks') || '目前無復健任務'}</Alert>
          )}
          {tasks.length > 0 && (
            <ul className="list-group mb-5">
              {tasks.map(task => (
                <li key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center" style={{ cursor: 'pointer' }} onClick={() => handleTaskClick(task)}>
                    <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                    <h5>{task.description}</h5>
                    <p className="mb-0 small ms-2">
                      {t('progress') || '進度'}: {task.progress || 0}%
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="d-none"
                      id={`upload-${task.id}`}
                      onChange={(e) => handleFileUpload(e, task.id)}
                      multiple
                    />
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="rounded-pill"
                      onClick={() => document.getElementById(`upload-${task.id}`).click()}
                    >
                      <FontAwesomeIcon icon={faUpload} /> {t('upload') || '上傳'}
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="rounded-pill ms-2"
                      onClick={() => handlePerformTask(task.id)}
                      disabled={loading}
                    >
                      {t('perform_task') || '執行任務'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h5 className="mb-3">{t('daily_records') || '每日記錄'}</h5>
          <div className="mb-4">
            <Button
              className="btn btn-outline-primary rounded-pill"
              onClick={handleAddDailyRecordClick}
            >
              {t('add_record') || '新增記錄'}
            </Button>
            <input
              type="file"
              accept="image/*,video/*"
              className="d-none"
              multiple
              ref={fileInputRef}
              onChange={handleDailyRecordUpload}
            />
          </div>

          <h5 className="mb-3">{t('assigned_forms') || '派發表單'}</h5>
          {forms.length === 0 && !loading && (
            <Alert variant="info" className="text-center">{t('no_forms') || '目前無派發表單'}</Alert>
          )}
          {forms.length > 0 && (
            <ul className="list-group mb-5">
              {forms.map(form => (
                <li key={form.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h5>{form.formQuestion?.title || form.formQuestion?.text || t('untitled_form') || '（無標題表單）'}</h5>
                    <p className="mb-0 small">
                      {t('status') || '狀態'}: {form.completed ? (t('completed') || '已完成') : (t('assigned') || '已分配')}
                    </p>
                  </div>
                  {!form.completed && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="rounded-pill"
                      onClick={() => handleFormClick(form)}
                    >
                      {t('fill_form') || '填寫表單'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <h5 className="mb-4 text-center text-muted">
            {t('welcome_guest') || '歡迎以訪客身份體驗系統功能，部分資料將不被記錄。'}
          </h5>
          <h5 className="mb-3">{t('available_tests') || '可體驗測驗'}</h5>
          <ul className="list-group mb-5">
            {[
              { name: t('balance_test') || '平衡測驗', route: '/interaction' },
              { name: t('wave_recognition') || '揮手辨識', route: '/interaction' },
            ].map((item, i) => (
              <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                {item.name}
                <Link to={item.route} className="btn btn-outline-primary btn-sm rounded-pill">
                  {t('try_now') || '立即體驗'}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="text-center mb-3">
        {!user && (
          <Link to="/register" className="btn btn-success rounded-pill px-4 py-2">
            {t('register_to_save') || '註冊帳號以保存記錄'}
          </Link>
        )}
      </div>

      <div className="text-center mb-3">
        <Button
          variant="outline-dark"
          className="rounded-pill d-flex align-items-center justify-content-center gap-2 mx-auto"
          onClick={() => setShowAssistant(prev => !prev)}
        >
          <FontAwesomeIcon icon={showAssistant ? faMicrophoneSlash : faMicrophone} />
          {showAssistant
            ? t('close_voice_assistant') || '關閉語音助理'
            : t('open_voice_assistant') || '開啟語音助理'}
        </Button>
      </div>
      {showAssistant && (
        <div className="border rounded p-3 bg-light">
          <VoiceAssistant />
        </div>
      )}

      <Modal show={showTaskModal} onHide={() => setShowTaskModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('patient_task_details') || '任務詳情'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTask && (
            <>
              <h5>{selectedTask.description}</h5>
              <p>{t('progress') || '進度'}: {selectedTask.progress || 0}%</p>
              <p>{t('task_guide') || '任務指引'}: {selectedTask.guide}</p>
              {selectedTask.form_id && <p>{t('related_form_id') || '相關表單 ID'}: {selectedTask.form_id}</p>}
              {selectedTask.media && selectedTask.media.length > 0 && (
                <div>
                  <h6>{t('uploaded_media') || '已上傳媒體'}</h6>
                  <ul>
                    {selectedTask.media.map((url, index) => (
                      <li key={index}><a href={url} target="_blank" rel="noopener noreferrer">{t('view_media') || '查看媒體'} {index + 1}</a></li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
            {t('close') || '關閉'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showFormModal} onHide={() => setShowFormModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedForm?.formQuestion?.title || selectedForm?.formQuestion?.text || (t('fill_form') || '填寫表單')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading && (
            <div className="text-center p-3">
              <FontAwesomeIcon icon={faSpinner} spin /> {t('loading') || '載入中...'}
            </div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}
          {formData && (
            <Form onSubmit={handleFormSubmit}>
              {formData.questions.map((q) => (
                <Form.Group key={q.text} className="mb-3">
                  <Form.Label>
                    {q.text} {q.required && <span className="text-danger">*</span>}
                  </Form.Label>
                  {q.type === 'single_choice' && (
                    <div>
                      {q.options.map((option, optIndex) => (
                        <Form.Check
                          key={optIndex}
                          type="radio"
                          name={`question-${q.text}`}
                          label={option}
                          value={option}
                          checked={responses[q.text] === option}
                          onChange={(e) => handleInputChange(q.text, e.target.value)}
                        />
                      ))}
                    </div>
                  )}
                  {q.type === 'multiple_choice' && (
                    <div>
                      {q.options.map((option, optIndex) => (
                        <Form.Check
                          key={optIndex}
                          type="checkbox"
                          name={`question-${q.text}`}
                          label={option}
                          value={option}
                          checked={responses[q.text]?.includes(option) || false}
                          onChange={(e) => handleCheckboxChange(q.text, e.target.value, e.target.checked)}
                        />
                      ))}
                    </div>
                  )}
                  {q.type === 'text' && (
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={responses[q.text] || ''}
                      onChange={(e) => handleInputChange(q.text, e.target.value)}
                    />
                  )}
                  {q.type === 'media_upload' && (
                    <Form.Control
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => handleFileChange(q.text, e.target.files)}
                    />
                  )}
                  {q.type === 'media_observation' && (
                    <>
                      {q.mediaUrl && (
                        <div className="mt-2 mb-3">
                          <a href={q.mediaUrl} target="_blank" rel="noopener noreferrer">
                            {t('view_media') || '查看觀察媒體'}
                          </a>
                        </div>
                      )}
                      <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder={t('your_response') || '請在此輸入您的回答...'}
                        value={responses[q.text] || ''}
                        onChange={(e) => handleInputChange(q.text, e.target.value)}
                      />
                    </>
                  )}
                  {validationErrors[q.text] && (
                    <Form.Text className="text-danger">{validationErrors[q.text]}</Form.Text>
                  )}
                </Form.Group>
              ))}
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> {t('submitting') || '提交中...'}
                  </>
                ) : (
                  t('submit') || '提交'
                )}
              </Button>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFormModal(false)}>
            {t('close') || '關閉'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}