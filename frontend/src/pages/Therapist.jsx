import { useState, useEffect, use } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getFormsByCreatorRole, decryptIdentity } from '../api';
import { Form, Button, Container } from 'react-bootstrap'; // <-- 確保有匯入 Form 和 Button
import Modal from 'react-bootstrap/Modal';

export default function Therapist({ user }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ patient_id: '', description: '', media_required: false, patient_name: '', caregiver_id: '', doctor_id: '', guide: '' });
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [formAssignPatientId, setFormAssignPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [editedQuestions, setEditedQuestions] = useState([]);
  const [editedFormTitle, setEditedFormTitle] = useState('');
  const [assignedItems, setAssignedItems] = useState([]);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedFormResponses, setSelectedFormResponses] = useState(null);
  const [mediaFilesToUpload, setMediaFilesToUpload] = useState({});
  const [showAbnormalReportModal, setShowAbnormalReportModal] = useState(false);
  const [abnormalReport, setAbnormalReport] = useState({ patient_id: '', description: '' });

  useEffect(() => {
    const fetchTasksAndForms = async () => {
      if (!user?.uid) {
        setError('用戶未登入');
        return;
      }
      setLoading(true);
      try {
        // 檢查用戶角色
        console.log(`Fetching user data for UID: ${user.uid}`);
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('__name__', '==', user.uid)
        ));
        if (userDoc.empty) {
          console.error(`No user document found for UID: ${user.uid}`);
          setError('用戶資料不存在，請聯繫管理員');
          return;
        }
        const userData = userDoc.docs[0].data();
        console.log(`User role: ${userData.role}`);
        if (userData.role !== 'therapist') {
          console.error(`Invalid role for UID: ${user.uid}, role: ${userData.role}`);
          setError('無效的用戶角色，僅限醫生訪問');
          return;
        }

        // 獲取任務
        console.log(`Fetching tasks for therapist_id: ${user.uid}`);
        const taskQuery = query(
          collection(db, 'tasks'),
          where('therapist_id', '==', user.uid)
        );
        const taskSnapshot = await getDocs(taskQuery);
        const taskList = taskSnapshot.docs.map(doc => ({ id: doc.id, type: 'task', ...doc.data() }));
        console.log(`Found ${taskList.length} tasks`);

        // 獲取已派發表單
        console.log(`Fetching assigned forms for therapist_id: ${user.uid}`);
        const formAssignedQuery = query(
          collection(db, 'formAssigned'),
          where('assigned_by', '==', user.uid)
        );
        const formAssignedSnapshot = await getDocs(formAssignedQuery);
        const formAssignedList = formAssignedSnapshot.docs.map(doc => ({ id: doc.id, type: 'form', ...doc.data() }));
        console.log(`Found ${formAssignedList.length} assigned forms`);

        // 合併任務和表單，並按個案姓名排序
        const combinedList = [...taskList, ...formAssignedList];
        const sortedList = await Promise.all(combinedList.map(async (item) => {
          const userRef = doc(db, 'users', item.patient_id || item.assigned_to);
          const userSnap = await getDoc(userRef);
          const patientData = userSnap.exists() ? userSnap.data() : { name: '未知病患', identity: '未知' };
          let decryptedIdentity = '未知';
          if (patientData.identity && patientData.identity !== '未知') {
            try {
              decryptedIdentity = decryptIdentity(patientData.identity).slice(-5);
            } catch (err) {
              console.error('Failed to decrypt identity:', err);
              decryptedIdentity = '解密失敗';
            }
          }
          return {
            ...item,
            patient_name: patientData.name ? patientData.name.charAt(0) + '*'.repeat(Math.max(0, patientData.name.length - 2)) + (patientData.name.length > 1 ? patientData.name.charAt(patientData.name.length - 1) : '') : '未知',
            identity: decryptedIdentity
          };
        }));
        sortedList.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
        setAssignedItems(sortedList);

        // 獲取表單
        console.log('Fetching forms with creator roles: hospital_admin, system_admin, therapist');
        const formList = await getFormsByCreatorRole(['hospital_admin', 'system_admin', 'therapist']);
        console.log(`Found ${formList.length} forms`);
        setForms(formList);

        // 如果無數據，設置提示訊息
        if (sortedList.length === 0 && formList.length === 0) {
          setError('目前無任務或表單可用');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.code === 'permission-denied') {
          setError('權限不足，無法載入資料，請檢查用戶角色或聯繫管理員');
        } else {
          setError(`無法載入資料：${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTasksAndForms();
  }, [user?.uid]);

  const seedTestData = async () => {
    setLoading(true);
    try {
      console.log("Seeding test data...");

      const taskRef = await addDoc(collection(db, "tasks"), {
        patient_id: "some_patient_id",
        patient_name: "測試病患",
        description: "測試任務：每天走路 15 分鐘",
        doctor_id: "some_doctor_id",
        status: "pending",
        completed: false,
        created_at: Timestamp.fromDate(new Date()),
        media_required: true,
        media_url: "https://example.com/test-video.mp4",
        caregiver_id: "some_caregiver_id",
        therapist_id: user.uid
      });
      console.log("Test Task created:", taskRef.id);

      const formRef = await addDoc(collection(db, "formData"), {
        title: "每日健康狀況測試表",
        questions: [
          {
            type: "single_choice",
            text: "今天感覺如何？",
            options: ["很好", "普通", "不好"],
            required: true
          },
          {
            type: "text",
            text: "今天有沒有服藥？",
            required: false
          }
        ],
        created_by: "system_admin_uid_123",
        created_by_role: "system_admin",
        created_at: new Date(),
      });
      console.log("Test Form created:", formRef.id);

      await addDoc(collection(db, "formAssigned"), {
        assigned_to: "some_patient_id",
        assigned_at: Timestamp.fromDate(new Date()),
        assigned_by: user.uid,
        completed: false,
        status: "assigned",
        formQuestion: (await getDoc(formRef)).data(),
        responses: {
          media: ["https://example.com/test.png"],
          "今天感覺如何？": "普通",
          "今天有沒有服藥？": "降壓藥",
        },
        submittedAt: Timestamp.fromDate(new Date())
      });
      console.log("Test Response created");

      const taskQuery = query(collection(db, "tasks"), where("therapist_id", "==", user.uid));
      const taskSnapshot = await getDocs(taskQuery);
      const formAssignedQuery = query(collection(db, "formAssigned"), where("assigned_by", "==", user.uid));
      const formAssignedSnapshot = await getDocs(formAssignedQuery);

      const combinedList = [
        ...taskSnapshot.docs.map(doc => ({ id: doc.id, type: 'task', ...doc.data() })),
        ...formAssignedSnapshot.docs.map(doc => ({ id: doc.id, type: 'form', ...doc.data() }))
      ];
      const sortedList = await Promise.all(combinedList.map(async (item) => {
        const userRef = doc(db, 'users', item.patient_id || item.assigned_to);
        const userSnap = await getDoc(userRef);
        const patientData = userSnap.exists() ? userSnap.data() : { name: '未知病患', identity: '未知' };
        let decryptedIdentity = '未知';
        if (patientData.identity && patientData.identity !== '未知') {
          try {
            decryptedIdentity = decryptIdentity(patientData.identity).slice(-5);
          } catch (err) {
            console.error('Failed to decrypt identity:', err);
            decryptedIdentity = '解密失敗';
          }
        }
        return {
          ...item,
          patient_name: patientData.name ? patientData.name.charAt(0) + '*'.repeat(Math.max(0, patientData.name.length - 2)) + (patientData.name.length > 1 ? patientData.name.charAt(patientData.name.length - 1) : '') : '未知',
          identity: decryptedIdentity
        };
      }));
      sortedList.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
      setAssignedItems(sortedList);

      const formList = await getFormsByCreatorRole(['hospital_admin', 'system_admin', 'therapist']);
      setForms(formList);

      setError(null);
      alert("測試資料建立完成 ✅");
    } catch (err) {
      console.error("Error seeding test data:", err);
      setError("建立測試資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log(`Fetching tasks for patient: ${newTask.patient_id}`);
      const userRef = doc(db, 'users', newTask.patient_id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log("找到病患資料：", userData);
        console.log(`Patient name: ${userData.name}`);
      } else {
        console.log("找不到對應的病患文件");
        setError('找不到對應的病患ID，請確認後再試');
        setLoading(false);
        return;
      }
      console.log(`Adding task for patient_id: ${newTask.patient_id}`);
      const taskData = {
        patient_id: newTask.patient_id,
        patient_name: userSnap.exists() ? userSnap.data().name : '未知病患',
        caregiver_id: newTask.caregiver_id,
        therapist_id: user.uid,
        description: newTask.description,
        doctor_id: newTask.doctor_id,
        status: 'pending',
        completed: false,
        media_required: newTask.media_required,
        created_at: Timestamp.fromDate(new Date()),
        media_url: newTask.media_required ? '' : null,
      };
      await addDoc(collection(db, 'tasks'), taskData);
      setNewTask({ patient_id: '', description: '', patient_name: '', doctor_id: '', caregiver_id: '', media_required: false });

      // 重新加載任務和表單
      const taskQuery = query(collection(db, 'tasks'), where('therapist_id', '==', user.uid));
      const taskSnapshot = await getDocs(taskQuery);
      const formAssignedQuery = query(collection(db, 'formAssigned'), where('assigned_by', '==', user.uid));
      const formAssignedSnapshot = await getDocs(formAssignedQuery);

      const combinedList = [
        ...taskSnapshot.docs.map(doc => ({ id: doc.id, type: 'task', ...doc.data() })),
        ...formAssignedSnapshot.docs.map(doc => ({ id: doc.id, type: 'form', ...doc.data() }))
      ];
      const sortedList = await Promise.all(combinedList.map(async (item) => {
        const userRef = doc(db, 'users', item.patient_id || item.assigned_to);
        const userSnap = await getDoc(userRef);
        const patientData = userSnap.exists() ? userSnap.data() : { name: '未知病患', identity: '未知' };
        let decryptedIdentity = '未知';
        if (patientData.identity && patientData.identity !== '未知') {
          try {
            decryptedIdentity = decryptIdentity(patientData.identity).slice(-5);
          } catch (err) {
            console.error('Failed to decrypt identity:', err);
            decryptedIdentity = '解密失敗';
          }
        }
        return {
          ...item,
          patient_name: patientData.name ? patientData.name.charAt(0) + '*'.repeat(Math.max(0, patientData.name.length - 2)) + (patientData.name.length > 1 ? patientData.name.charAt(patientData.name.length - 1) : '') : '未知',
          identity: decryptedIdentity
        };
      }));
      sortedList.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
      setAssignedItems(sortedList);

      setError(null);
    } catch (err) {
      console.error('Error adding task:', err);
      setError('無法新增任務');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      console.log(`Updating task ${taskId} to status: ${newStatus}`);
      const updates = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed = true;
      }
      await updateDoc(doc(db, 'tasks', taskId), updates);
      setAssignedItems(assignedItems.map(item =>
        item.id === taskId && item.type === 'task'
          ? { ...item, status: newStatus, completed: newStatus === 'completed' }
          : item
      ));
      setError(null);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('更新任務狀態失敗');
    }
  };

  const handleEditForm = async (formId) => {
    try {
      const formDoc = await getDoc(doc(db, 'formData', formId));
      setEditingForm(formDoc.data());
      setEditedQuestions(formDoc.data().questions || []);
      setEditedFormTitle(formDoc.data().title || '');
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading form for editing:', err);
      setError('無法載入表單進行編輯');
    }
  };

  const handleSaveEditedForm = async () => {
    if (!formAssignPatientId) {
      setError('請輸入病患ID');
      return;
    }
    try {
      setLoading(true);
      console.log(`Assigning edited form to patient ${formAssignPatientId}`);
      const userRef = doc(db, 'users', formAssignPatientId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setError('找不到對應的病患ID，請確認後再試');
        setLoading(false);
        return;
      }

      // 先建立一個空的 formAssigned 文件，以取得它的 ID
      const formAssignDocRef = await addDoc(collection(db, 'formAssigned'), {
        assigned_to: formAssignPatientId,
        assigned_by: user.uid,
        assigned_at: Timestamp.fromDate(new Date()),
        status: 'assigned',
        completed: false,
        responses: {},
      });

      const questionsWithMediaUrls = await Promise.all(editedQuestions.map(async (question, index) => {
        if (question.type === 'media_observation' && mediaFilesToUpload[index]) {
          const file = mediaFilesToUpload[index];
          // 使用新建立的 formAssigned 文件 ID
          const downloadUrl = await uploadMedia(file, formAssignPatientId, 'form', formAssignDocRef.id, user.role, question.text);
          return { ...question, mediaUrl: downloadUrl };
        }
        return question;
      }));

      // 上傳完成後，更新 formAssigned 文件
      await updateDoc(doc(db, 'formAssigned', formAssignDocRef.id), {
        form_id: selectedForm,
        formQuestion: {
          ...editingForm,
          title: editedFormTitle,
          questions: questionsWithMediaUrls,
          created_by: user.uid,
          created_by_role: 'therapist',
          created_at: Timestamp.fromDate(new Date()),
          original_form_id: selectedForm
        }
      });

      // 重新加載任務和表單
      const taskQuery = query(collection(db, 'tasks'), where('therapist_id', '==', user.uid));
      const taskSnapshot = await getDocs(taskQuery);
      const formAssignedQuery = query(collection(db, 'formAssigned'), where('assigned_by', '==', user.uid));
      const formAssignedSnapshot = await getDocs(formAssignedQuery);

      const combinedList = [
        ...taskSnapshot.docs.map(doc => ({ id: doc.id, type: 'task', ...doc.data() })),
        ...formAssignedSnapshot.docs.map(doc => ({ id: doc.id, type: 'form', ...doc.data() }))
      ];
      const sortedList = await Promise.all(combinedList.map(async (item) => {
        const userRef = doc(db, 'users', item.patient_id || item.assigned_to);
        const userSnap = await getDoc(userRef);
        const patientData = userSnap.exists() ? userSnap.data() : { name: '未知病患', identity: '未知' };
        let decryptedIdentity = '未知';
        if (patientData.identity && patientData.identity !== '未知') {
          try {
            decryptedIdentity = decryptIdentity(patientData.identity).slice(-5);
          } catch (err) {
            console.error('Failed to decrypt identity:', err);
            decryptedIdentity = '解密失敗';
          }
        }
        return {
          ...item,
          patient_name: patientData.name ? patientData.name.charAt(0) + '*'.repeat(Math.max(0, patientData.name.length - 2)) + (patientData.name.length > 1 ? patientData.name.charAt(patientData.name.length - 1) : '') : '未知',
          identity: decryptedIdentity
        };
      }));
      sortedList.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
      setAssignedItems(sortedList);

      setShowEditModal(false);
      setEditingForm(null);
      setEditedQuestions([]);
      setEditedFormTitle('');
      setSelectedForm('');
      setFormAssignPatientId('');
      setError(null);
    } catch (err) {
      console.error('Error assigning edited form:', err);
      setError('派發編輯表單失敗');
    } finally {
      setLoading(false);
    }
  };
  const handleFileChange = (index, file) => {
    setMediaFilesToUpload({ ...mediaFilesToUpload, [index]: file });
  };
  // ...existing code...

  const handleAddQuestion = () => {
    setEditedQuestions([...editedQuestions, {
      type: 'text',
      text: '',
      required: false,
      options: []
    }]);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...editedQuestions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setEditedQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index) => {
    setEditedQuestions(editedQuestions.filter((_, i) => i !== index));
  };

  const handleAssignForm = async (e) => {
    e.preventDefault();
    if (!selectedForm || !formAssignPatientId) {
      setError('請選擇表單並輸入病患ID');
      return;
    }
    setLoading(true);
    try {
      console.log(`Assigning form ${selectedForm} to patient ${formAssignPatientId}`);
      const formDoc = await getDoc(doc(db, 'formData', selectedForm));
      console.log('Form document data:', formDoc.data());
      const userRef = doc(db, 'users', formAssignPatientId);
      const userSnap = await getDoc(userRef);
      const patientData = userSnap.exists() ? userSnap.data() : { name: '未知病患', identity: '未知' };
      let decryptedIdentity = '未知';
      if (patientData.identity && patientData.identity !== '未知') {
        try {
          decryptedIdentity = decryptIdentity(patientData.identity).slice(-5);
        } catch (err) {
          console.error('Failed to decrypt identity:', err);
          decryptedIdentity = '解密失敗';
        }
      }

      await addDoc(collection(db, 'formAssigned'), {
        form_id: selectedForm,
        assigned_to: formAssignPatientId,
        assigned_by: user.uid,
        assigned_at: Timestamp.fromDate(new Date()),
        status: 'assigned',
        completed: false,
        responses: {},
        formQuestion: formDoc.data()
      });

      // 重新加載任務和表單
      const taskQuery = query(collection(db, 'tasks'), where('therapist_id', '==', user.uid));
      const taskSnapshot = await getDocs(taskQuery);
      const formAssignedQuery = query(collection(db, 'formAssigned'), where('assigned_by', '==', user.uid));
      const formAssignedSnapshot = await getDocs(formAssignedQuery);

      const combinedList = [
        ...taskSnapshot.docs.map(doc => ({ id: doc.id, type: 'task', ...doc.data() })),
        ...formAssignedSnapshot.docs.map(doc => ({ id: doc.id, type: 'form', ...doc.data() }))
      ];
      const sortedList = await Promise.all(combinedList.map(async (item) => {
        const userRef = doc(db, 'users', item.patient_id || item.assigned_to);
        const userSnap = await getDoc(userRef);
        const patientData = userSnap.exists() ? userSnap.data() : { name: '未知病患', identity: '未知' };
        let decryptedIdentity = '未知';
        if (patientData.identity && patientData.identity !== '未知') {
          try {
            decryptedIdentity = decryptIdentity(patientData.identity).slice(-5);
          } catch (err) {
            console.error('Failed to decrypt identity:', err);
            decryptedIdentity = '解密失敗';
          }
        }
        return {
          ...item,
          patient_name: patientData.name ? patientData.name.charAt(0) + '*'.repeat(Math.max(0, patientData.name.length - 2)) + (patientData.name.length > 1 ? patientData.name.charAt(patientData.name.length - 1) : '') : '未知',
          identity: decryptedIdentity
        };
      }));
      sortedList.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
      setAssignedItems(sortedList);

      setSelectedForm('');
      setFormAssignPatientId('');
      const formList = await getFormsByCreatorRole(['hospital_admin', 'system_admin', 'therapist']);
      setForms(formList);
      setError(null);
    } catch (err) {
      console.error('Error assigning form:', err);
      setError('表單派發失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResponses = (form) => {
    setSelectedFormResponses(form);
    setShowResponseModal(true);
  };

  const handleAddAbnormalReport = async (e) => {
    e.preventDefault();
    if (!abnormalReport.patient_id || !abnormalReport.description) {
      setError('請輸入病患ID和通報內容');
      return;
    }

    setLoading(true);
    try {
      console.log('Adding abnormal report for patient:', abnormalReport.patient_id);
      await addDoc(collection(db, 'abnormalReports'), {
        patient_id: abnormalReport.patient_id,
        therapist_id: user.uid,
        description: abnormalReport.description,
        createdAt: Timestamp.fromDate(new Date()),
      });
      console.log('Abnormal report added successfully.');
      setAbnormalReport({ patient_id: '', description: '' });
      setShowAbnormalReportModal(false);
      setError(null);
      alert('異常通報已送出！');
    } catch (err) {
      console.error('Error adding abnormal report:', err);
      setError('異常通報失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <div className="mb-4 text-center">
        <button
          className="btn btn-warning w-100 rounded-pill shadow-sm"
          onClick={seedTestData}
          disabled={loading}
        >
          {loading ? "建立中..." : "建立測試資料"}
        </button>
      </div>
      <h2 className="text-center mb-4">{t('therapist_dashboard')}</h2>
      {loading && <div className="text-center p-5">載入中...</div>}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      <h5 className="mb-3">{t('assign_form')}</h5>
      {forms.length === 0 && !loading && !error && (
        <div className="alert alert-info text-center">目前無可用表單</div>
      )}
      <form onSubmit={handleAssignForm} className="mb-5">
        <div className="mb-3 input-group">
          <select
            className="form-control"
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            required
          >
            <option value="">選擇表單</option>
            {forms.map(form => (
              <option key={form.id} value={form.id}>{form.title}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => handleEditForm(selectedForm)}
            disabled={!selectedForm}
          >
            編輯表單
          </button>
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="病患ID"
            value={formAssignPatientId}
            onChange={(e) => setFormAssignPatientId(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-success w-100 rounded-pill shadow-sm"
          disabled={loading}
        >
          {loading ? '派發中...' : '派發表單'}
        </button>
      </form>

      {showEditModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">編輯表單</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">表單名稱</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editedFormTitle}
                    onChange={(e) => setEditedFormTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">病患ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="請輸入病患ID"
                    value={formAssignPatientId}
                    onChange={(e) => setFormAssignPatientId(e.target.value)}
                    required
                  />
                </div>
                {editedQuestions.map((question, index) => (
                  <div key={index} className="card mb-3">
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label">問題類型</label>
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
                        <label className="form-label">問題內容</label>
                        <input
                          type="text"
                          className="form-control"
                          value={question.text || ''}
                          onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                        />
                      </div>
                      {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                        <div className="mb-3">
                          <label className="form-label">選項 (以逗號分隔)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={question.options.join(',')}
                            onChange={(e) => handleQuestionChange(index, 'options', e.target.value.split(','))}
                          />
                        </div>
                      )}
                      {question.type === 'media_observation' && (
                        <div className="mb-3">
                          <label className="form-label">{t('media_url') || '觀察媒體 URL (可選)'}</label>
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
                        <label className="form-check-label">必填</label>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteQuestion(index)}
                      >
                        刪除問題
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="btn btn-primary mb-3"
                  onClick={handleAddQuestion}
                >
                  新增問題
                </button>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEditedForm}
                  disabled={loading || !formAssignPatientId || !editedFormTitle}
                >
                  {loading ? '派發中...' : '直接派發'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <h5 className="mb-3">{t('add_task')}</h5>
      <form onSubmit={handleAddTask} className="mb-5">
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="個案ID"
            value={newTask.patient_id}
            onChange={(e) => setNewTask({ ...newTask, patient_id: e.target.value })}
            required
          />
        </div>

        <div className="mb-3">
          <textarea
            className="form-control"
            placeholder={t('doctor_id')}
            value={newTask.doctor_id}
            onChange={(e) => setNewTask({ ...newTask, doctor_id: e.target.value })}
            required
          />
        </div>
        <div className="mb-3">
          <textarea
            className="form-control"
            placeholder={t('caregiver_id')}
            value={newTask.caregiver_id}
            onChange={(e) => setNewTask({ ...newTask, caregiver_id: e.target.value })}
            required
          />
        </div>
        <div className="mb-3">
          <textarea
            className="form-control"
            placeholder="任務描述（如：10次卧推）"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            required
          />
        </div>
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            checked={newTask.media_required}
            onChange={(e) => setNewTask({ ...newTask, media_required: e.target.checked })}
          />
          <label className="form-check-label">要求上傳圖像/影片</label>
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100 rounded-pill shadow-sm"
          disabled={loading}
        >
          {loading ? '新增中...' : '新增任務'}
        </button>
      </form>

      <h5 className="mb-3">已派發項目</h5>
      {assignedItems.length === 0 && !loading && !error && (
        <div className="alert alert-info text-center">目前無已派發的任務或表單</div>
      )}
      {assignedItems.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>編號</th>
                <th>個案姓名</th>
                <th>身分證字號後五碼</th>
                <th>派發任務</th>
                <th>派發表單</th>
                <th>完成狀態</th>
                <th>批閱狀態</th>
              </tr>
            </thead>
            <tbody>
              {assignedItems.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.patient_name}</td>
                  <td>{item.identity}</td>
                  <td>
                    {item.type === 'task' ? (
                      <>
                        {item.description}
                        {item.media_required && item.media_url && (
                          <div className="mt-1">
                            <a href={item.media_url} target="_blank" rel="noopener noreferrer">
                              查看上傳的影片/圖像
                            </a>
                          </div>
                        )}
                      </>
                    ) : '-'}
                  </td>
                  <td>
                    {item.type === 'form' ? (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewResponses(item);
                        }}
                        className="text-primary"
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {item.formQuestion.title}
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    {item.completed ? (
                      <span className="badge bg-success">已完成</span>
                    ) : (
                      <span className="badge bg-warning">未完成</span>
                    )}
                  </td>
                  <td>
                    {item.type === 'task' ? (
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        className="form-select form-select-sm"
                      >
                        <option value="pending">待處理</option>
                        <option value="in_progress">進行中</option>
                        <option value="reviewed">已審核</option>
                      </select>
                    ) : item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={showResponseModal} onHide={() => setShowResponseModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('form_responses') || '表單回應'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFormResponses ? (
            <>
              <h5>{selectedFormResponses.formQuestion.title}</h5>
              <p>個案姓名: {selectedFormResponses.patient_name}</p>
              <p>提交時間: {selectedFormResponses.submittedAt ? selectedFormResponses.submittedAt.toDate().toLocaleString() : '尚未提交'}</p>
              {selectedFormResponses.formQuestion.questions.map((question, index) => (
                <div key={index} className="mb-3">
                  <h6>{question.text}</h6>

                  {question.type === 'media_upload' ? (
                    selectedFormResponses.responses[question.text]?.length > 0 ? (
                      selectedFormResponses.responses[question.text].map((url, i) => (
                        <div key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            查看檔案 {i + 1}
                          </a>
                        </div>
                      ))
                    ) : (
                      <p>無回應</p>
                    )
                  ) : question.type === 'pose_detection' ? (
                    <>
                      <p>目標動作: {question.target_action || '未設定'}</p>
                      <p>要求次數: {question.reps_required || '未設定'}</p>
                      <p>
                        回應:
                        {selectedFormResponses.responses[question.text] ? (
                          <button
                            className="btn btn-sm btn-info ms-2"
                            onClick={() => alert(`患者已完成動作，動作結果：${JSON.stringify(selectedFormResponses.responses[question.text], null, 2)}`)}
                          >
                            查看動作細節
                          </button>
                        ) : (
                          '無回應'
                        )}
                      </p>
                    </>
                  ) : (
                    <p>
                      回應: {selectedFormResponses.responses[question.text] || '無回應'}
                      {question.type === 'single_choice' && selectedFormResponses.responses[question.text] && (
                        <span>
                          (
                          {question.options.includes(selectedFormResponses.responses[question.text])
                            ? '有效'
                            : '無效選項'}
                          )
                        </span>
                      )}
                      {question.type === 'multiple_choice' &&
                        Array.isArray(selectedFormResponses.responses[question.text]) && (
                          <span>
                            (
                            {selectedFormResponses.responses[question.text].every(opt =>
                              question.options.includes(opt)
                            )
                              ? '有效'
                              : '部分無效選項'}
                            )
                          </span>
                        )}
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p>無回應資料</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowResponseModal(false)}>
            {t('close') || '關閉'}
          </button>
        </Modal.Footer>
      </Modal>
      {/* 異常通報按鈕 */}
<div className="mb-4 text-center">
  <button
    className="btn btn-danger w-100 rounded-pill shadow-sm"
    onClick={() => setShowAbnormalReportModal(true)}
  >
    {t('abnormal_report') || '異常通報'}
  </button>
</div>

{/* 異常通報 Modal */}
<Modal show={showAbnormalReportModal} onHide={() => setShowAbnormalReportModal(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>{t('add_abnormal_report') || '新增異常通報'}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form onSubmit={handleAddAbnormalReport}>
      <Form.Group className="mb-3">
        <Form.Label>{t('patient_id') || '病患ID'}</Form.Label>
        <Form.Control
          type="text"
          placeholder={t('enter_patient_id') || '請輸入病患ID'}
          value={abnormalReport.patient_id}
          onChange={(e) => setAbnormalReport({ ...abnormalReport, patient_id: e.target.value })}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>{t('report_description') || '通報內容'}</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          placeholder={t('enter_report_description') || '請描述異常狀況'}
          value={abnormalReport.description}
          onChange={(e) => setAbnormalReport({ ...abnormalReport, description: e.target.value })}
          required
        />
      </Form.Group>
      <div className="d-grid gap-2">
        <Button variant="danger" type="submit" disabled={loading}>
          {loading ? '送出中...' : '送出通報'}
        </Button>
      </div>
    </Form>
  </Modal.Body>
</Modal>
    </div>
  );
}