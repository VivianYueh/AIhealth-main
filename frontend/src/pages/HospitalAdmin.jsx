import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getFormsByCreatorRole, uploadMedia } from '../api';
import Modal from 'react-bootstrap/Modal';

export default function HospitalAdmin({ user }) {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [editingForm, setEditingForm] = useState(null);
  const [editedQuestions, setEditedQuestions] = useState([]);
  const [editedFormTitle, setEditedFormTitle] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false); // 新增：控制更改角色 Modal
  const [selectedUser, setSelectedUser] = useState(null); // 新增：選中的用戶
  const [newRole, setNewRole] = useState(''); // 新增：新角色
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mediaFilesToUpload, setMediaFilesToUpload] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 新增：檢查用戶角色
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'hospital_admin') {
          setError('無權訪問，僅限醫院管理員');
          return;
        }

        // 查詢醫師與治療師帳號
        const accountQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['doctor', 'therapist'])
        );
        const accountSnapshot = await getDocs(accountQuery);
        const accountList = accountSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAccounts(accountList);

        // 查詢去識別化數據分析
        const analyticsQuery = query(collection(db, 'analytics'));
        const analyticsSnapshot = await getDocs(analyticsQuery);
        const analyticsList = analyticsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnalytics(analyticsList);

        // 獲取表單
        console.log('Fetching forms with creator roles: hospital_admin, system_admin');
        const formList = await getFormsByCreatorRole(['hospital_admin', 'system_admin']);
        console.log(`Found ${formList.length} forms`);
        setForms(formList);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('無法載入資料');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.uid]);

  const handleCreateForm = () => {
    setNewFormTitle('');
    setNewQuestions([]);
    setShowCreateModal(true);
  };

  const handleSaveNewForm = async () => {
    try {
      setLoading(true);
      if (!newFormTitle) {
        setError('請輸入表單名稱');
        return;
      }
      const newFormData = {
        title: newFormTitle,
        //questions: newQuestions,
        created_by: user.uid,
        created_by_role: 'hospital_admin',
        created_at: Timestamp.fromDate(new Date()),
      };

      const newForm=await addDoc(collection(db, 'formData'), newFormData);
      const questionsWithMediaUrls = await Promise.all(newQuestions.map(async (question, index) => {
        console.log('question type:', question.type);
        console.log('question:', question);
        if (question.type === 'media_observation' && mediaFilesToUpload[index]) {
          const file = mediaFilesToUpload[index];
          const downloadUrl = await uploadMedia(file, newForm.id, 'formData', newForm.id, user.role, question.text);
          return { ...question, mediaUrl: downloadUrl };
        }
        return question;
      }));

      await updateDoc(doc(db, 'formData', newForm.id), { questions: questionsWithMediaUrls });
      const formList = await getFormsByCreatorRole(['hospital_admin', 'system_admin']);
      setForms(formList);
      setShowCreateModal(false);
      setNewFormTitle('');
      setNewQuestions([]);
      setError(null);
      alert('表單建立成功');
    } catch (err) {
      console.error('Error creating new form:', err);
      setError('建立表單失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setNewQuestions([...newQuestions, {
      type: 'text',
      title: '',
      required: false,
      options: [],
      mediaUrl: ''
    }]);
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...newQuestions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setNewQuestions(updatedQuestions);
  };

  const handleDeleteQuestion = (index) => {
    setNewQuestions(newQuestions.filter((_, i) => i !== index));
  };

  const handleEditForm = async (formId) => {
    try {
      const formDoc = await getDoc(doc(db, 'formData', formId));
      if (formDoc.exists()) {
        setEditingForm(formDoc.data());
        setEditedQuestions(formDoc.data().questions || []);
        setEditedFormTitle(formDoc.data().title || '');
        setSelectedForm(formId);
        setShowEditModal(true);
      } else {
        setError('表單不存在');
      }
    } catch (err) {
      console.error('Error loading form for editing:', err);
      setError('無法載入表單進行編輯');
    }
  };

  const handleSaveEditedForm = async () => {
    try {
      setLoading(true);
      if (!editedFormTitle) {
        setError('請輸入表單名稱');
        return;
      }
      const questionsWithMediaUrls = await Promise.all(editedQuestions.map(async (question, index) => {
        console.log('question type:', question.type);
        if (question.type === 'media_observation' && mediaFilesToUpload[index]) {
          const file = mediaFilesToUpload[index];
          // 使用新建立的 formAssigned 文件 ID
          const downloadUrl = await uploadMedia(file, question.id, 'formData', question.id, user.role, question.text);
          return { ...question, mediaUrl: downloadUrl };
        }
        return question;
      }));
      const updatedFormData = {
        title: editedFormTitle,
        questions: questionsWithMediaUrls,
        updated_at: Timestamp.fromDate(new Date()),
      };
      await updateDoc(doc(db, 'formData', selectedForm), updatedFormData);
      const formList = await getFormsByCreatorRole(['hospital_admin', 'system_admin']);
      setForms(formList);
      setShowEditModal(false);
      setEditingForm(null);
      setEditedQuestions([]);
      setEditedFormTitle('');
      setSelectedForm('');
      setError(null);
      alert('表單更新成功');
    } catch (err) {
      console.error('Error saving edited form:', err);
      setError('儲存編輯表單失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEditQuestion = () => {
    setEditedQuestions([...editedQuestions, {
      type: 'text',
      text: '',
      required: false,
      options: [],
      mediaUrl: ''
    }]);
  };

  const handleEditQuestionChange = (index, field, value) => {
    const newQuestions = [...editedQuestions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setEditedQuestions(newQuestions);
  };

  const handleFileChange = (index, file) => {
    setMediaFilesToUpload({ ...mediaFilesToUpload, [index]: file });
  };

  const handleDeleteEditQuestion = (index) => {
    setEditedQuestions(editedQuestions.filter((_, i) => i !== index));
  };

  // 新增：處理更改角色
  const handleChangeRole = (account) => {
    setSelectedUser(account);
    setNewRole(account.role);
    setShowRoleModal(true);
  };

  // 新增：儲存新角色
  const handleSaveRole = async () => {
    try {
      setLoading(true);
      if (!newRole) {
        setError('請選擇角色');
        return;
      }
      await updateDoc(doc(db, 'users', selectedUser.id), { role: newRole });
      setAccounts(accounts.map(account =>
        account.id === selectedUser.id ? { ...account, role: newRole } : account
      ));
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
      setError(null);
      alert('角色更新成功');
    } catch (err) {
      console.error('Error updating role:', err);
      setError('更新角色失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 800 }}>
      <h2 className="text-center mb-4">{t('hospital_admin_dashboard')}</h2>
      {loading && <div className="text-center p-5">載入中...</div>}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      <h5 className="mb-3">{t('account_management')}</h5>
      {accounts.length === 0 && !loading && (
        <div className="alert alert-info text-center">目前無帳號資料</div>
      )}
      {accounts.length > 0 && (
        <ul className="list-group mb-5">
          {accounts.map(account => (
            <li key={account.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <h5>{account.name}</h5>
                <p className="mb-0 small">{t('role')}: {(account.role=='doctor'?t('role_doctor'):t('role_therapist'))}</p>
              </div>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => handleChangeRole(account)}
              >
                {t('change_role') || '更改身分'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 新增：更改角色 Modal */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('change_role') || '更改身分'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <>
              <p>{t('user') || '用戶'}: {selectedUser.name}</p>
              <div className="mb-3">
                <label className="form-label">{t('new_role') || '新角色'}</label>
                <select
                  className="form-control"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="">{t('select_role') || '選擇角色'}</option>
                  <option value="doctor">{t('role_doctor') || '醫師'}</option>
                  <option value="therapist">{t('role_therapist') || '治療師'}</option>
                </select>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRoleModal(false)}
          >
            {t('cancel') || '取消'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveRole}
            disabled={loading || !newRole}
          >
            {loading ? t('saving') || '儲存中...' : t('save') || '儲存'}
          </button>
        </Modal.Footer>
      </Modal>

      <h5 className="mb-3">{t('form_management')}</h5>
      <div className="mb-3">
        <button
          className="btn btn-primary w-100 rounded-pill shadow-sm"
          onClick={handleCreateForm}
          disabled={loading}
        >
          {t('create_new_form') || '建立新表單'}
        </button>
      </div>
      {forms.length === 0 && !loading && (
        <div className="alert alert-info text-center">目前無表單資料</div>
      )}
      {forms.length > 0 && (
        <ul className="list-group mb-5">
          {forms.map(form => (
            <li key={form.id} className="list-group-item d-flex justify-content-between align-items-center">
              <h5>{form.title}</h5>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => handleEditForm(form.id)}
              >
                {t('edit_form') || '編輯表單'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('create_form') || '建立新表單'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">{t('form_title') || '表單名稱'}</label>
            <input
              type="text"
              className="form-control"
              value={newFormTitle}
              onChange={(e) => setNewFormTitle(e.target.value)}
              required
              placeholder={t('enter_form_title') || '輸入表單名稱'}
            />
          </div>
          {newQuestions.map((question, index) => (
            <div key={index} className="card mb-3">
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">{t('question_type') || '問題類型'}</label>
                  <select
                    className="form-control"
                    value={question.type}
                    onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                  >
                    <option value="text">{t('text') || '開放式文字題'}</option>
                    <option value="single_choice">{t('single_choice') || '單選題'}</option>
                    <option value="multiple_choice">{t('multiple_choice') || '多選題'}</option>
                    <option value="media_upload">{t('media_upload') || '圖像/影片上傳'}</option>
                    <option value="media_observation">{t('media_observation') || '圖像/影片觀察題'}</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('question_title') || '問題內容'}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={question.text}
                    onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                    placeholder={t('enter_question_title') || '輸入問題內容'}
                  />
                </div>
                {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                  <div className="mb-3">
                    <label className="form-label">{t('options') || '選項 (以逗號分隔)'}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={question.options.join(',')}
                      onChange={(e) => handleQuestionChange(index, 'options', e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt))}
                      placeholder={t('enter_options') || '輸入選項，用逗號分隔'}
                    />
                  </div>
                )}
                {question.type === 'media_observation' && (
                  <div className="mb-3">
                      <label className="form-label">觀察媒體</label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={(e) => handleFileChange(index, e.target.files[0])}
                      />
                      {mediaFilesToUpload[index] && (
                          <p className="mt-2 text-success">已選取檔案: {mediaFilesToUpload[index].name}</p>
                      )}
                      {question.mediaUrl && !mediaFilesToUpload[index] && (
                        <div className="mt-2">
                          <a href={question.mediaUrl} target="_blank" rel="noopener noreferrer">
                            查看現有檔案
                          </a>
                        </div>
                      )}
                  </div>
                )}
                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={question.required}
                    onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                  />
                  <label className="form-check-label">{t('required') || '必填'}</label>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteQuestion(index)}
                >
                  {t('delete_question') || '刪除問題'}
                </button>
              </div>
            </div>
          ))}
          <button
            className="btn btn-primary mb-3"
            onClick={handleAddQuestion}
          >
            {t('add_question') || '新增問題'}
          </button>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCreateModal(false)}
          >
            {t('cancel') || '取消'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveNewForm}
            disabled={loading || !newFormTitle}
          >
            {loading ? t('saving') || '儲存中...' : t('save') || '儲存'}
          </button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('edit_form') || '編輯表單'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">{t('form_title') || '表單名稱'}</label>
            <input
              type="text"
              className="form-control"
              value={editedFormTitle}
              onChange={(e) => setEditedFormTitle(e.target.value)}
              required
            />
          </div>
          {editedQuestions.map((question, index) => (
            <div key={index} className="card mb-3">
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">{t('question_type') || '問題類型'}</label>
                  <select
                    className="form-control"
                    value={question.type}
                    onChange={(e) => handleEditQuestionChange(index, 'type', e.target.value)}
                  >
                    <option value="text">{t('text') || '開放式文字題'}</option>
                    <option value="single_choice">{t('single_choice') || '單選題'}</option>
                    <option value="multiple_choice">{t('multiple_choice') || '多選題'}</option>
                    <option value="media_upload">{t('media_upload') || '圖像/影片上傳'}</option>
                    <option value="media_observation">{t('media_observation') || '圖像/影片觀察題'}</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('question_title') || '問題內容'}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={question.text}
                    onChange={(e) => handleEditQuestionChange(index, 'title', e.target.value)}
                    placeholder={t('enter_question_title') || '輸入問題內容'}
                  />
                </div>
                {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                  <div className="mb-3">
                    <label className="form-label">{t('options') || '選項 (以逗號分隔)'}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={question.options.join(',')}
                      onChange={(e) => handleEditQuestionChange(index, 'options', e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt))}
                      placeholder={t('enter_options') || '輸入選項，用逗號分隔'}
                    />
                  </div>
                )}
                {question.type === 'media_observation' && (
                  <div className="mb-3">
                      <label className="form-label">觀察媒體</label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={(e) => handleFileChange(index, e.target.files[0])}
                      />
                      {mediaFilesToUpload[index] && (
                          <p className="mt-2 text-success">已選取檔案: {mediaFilesToUpload[index].name}</p>
                      )}
                      {question.mediaUrl && !mediaFilesToUpload[index] && (
                        <div className="mt-2">
                          <a href={question.mediaUrl} target="_blank" rel="noopener noreferrer">
                            查看現有檔案
                          </a>
                        </div>
                      )}
                  </div>
                )}
                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={question.required}
                    onChange={(e) => handleEditQuestionChange(index, 'required', e.target.checked)}
                  />
                  <label className="form-check-label">{t('required') || '必填'}</label>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteEditQuestion(index)}
                >
                  {t('delete_question') || '刪除問題'}
                </button>
              </div>
            </div>
          ))}
          <button
            className="btn btn-primary mb-3"
            onClick={handleAddEditQuestion}
          >
            {t('add_question') || '新增問題'}
          </button>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowEditModal(false)}
          >
            {t('cancel') || '取消'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveEditedForm}
            disabled={loading || !editedFormTitle}
          >
            {loading ? t('saving') || '儲存中...' : t('save') || '儲存'}
          </button>
        </Modal.Footer>
      </Modal>

      <h5 className="mb-3">{t('data_analytics')}</h5>
      {analytics.length === 0 && !loading && (
        <div className="alert alert-info text-center">目前無數據分析</div>
      )}
      {analytics.length > 0 && (
        <ul className="list-group">
          {analytics.map(data => (
            <li key={data.id} className="list-group-item">
              <h5>{data.title}</h5>
              <p className="mb-0 small">{data.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}