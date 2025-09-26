import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as bootstrap from 'bootstrap';
import { decryptIdentity } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Caregiver({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);               // 全部任務
  const [patients, setPatients] = useState({});         // 病人基本資料
  const [patientTasks, setPatientTasks] = useState({}); // 病人任務
  const [patientForms, setPatientForms] = useState({}); // 病人表單
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [patientError, setPatientError] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const relatedIds = userDoc.data().related_ids || [];

        const patientDetails = {};
        const patientTasksData = {};
        const patientFormsData = {};

        for (const [index, patientId] of relatedIds.entries()) {
          const patientDoc = await getDoc(doc(db, 'users', patientId));
          if (patientDoc.exists() && patientDoc.data().role === 'patient') {
            const { name, email, phone, identity } = patientDoc.data();
            const decryptedIdentity = identity ? decryptIdentity(identity) : '未知';
            const maskedName = name
              ? name.charAt(0) +
                '*'.repeat(Math.max(0, name.length - 2)) +
                (name.length > 1 ? name.charAt(name.length - 1) : '')
              : '未知';

            patientDetails[patientId] = {
              index: index + 1,
              name: maskedName,
              email,
              phone,
              identity: decryptedIdentity ? decryptedIdentity.slice(-5) : '未知',
            };

            // 🔹 查詢 tasks (patient_id == patientId OR caregiver_id == user.uid)
            const qTasks = query(collection(db, 'tasks'), where('patient_id', '==', patientId));
            const qCaregiverTasks = query(collection(db, 'tasks'), where('caregiver_id', '==', user.uid));
            const [snap1, snap2] = await Promise.all([getDocs(qTasks), getDocs(qCaregiverTasks)]);
            const taskList = [...snap1.docs, ...snap2.docs].map((doc) => ({ id: doc.id, ...doc.data() }));
            patientTasksData[patientId] = taskList;

            // 🔹 查詢 formAssigned (assigned_to == patientId OR caregiver_id == user.uid)
            const qForms = query(collection(db, 'formAssigned'), where('assigned_to', '==', patientId));
            const qCaregiverForms = query(collection(db, 'formAssigned'), where('caregiver_id', '==', user.uid));
            const [f1, f2] = await Promise.all([getDocs(qForms), getDocs(qCaregiverForms)]);
            const formList = [...f1.docs, ...f2.docs].map((doc) => ({ id: doc.id, ...doc.data() }));
            patientFormsData[patientId] = formList;
          }
        }

        setPatients(patientDetails);
        setPatientTasks(patientTasksData);
        setPatientForms(patientFormsData);

        // 全部任務集合
        const allTasks = Object.values(patientTasksData).flat();
        setTasks(allTasks);
      } catch (err) {
        console.error(err);
        setError(t('failed_to_load_tasks'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.uid, t]);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setPatientError(null);

    try {
      if (!newPatientId) {
        throw new Error(t('please_enter_patient_id'));
      }

      const caregiverRef = doc(db, 'users', user.uid);
      const patientRef = doc(db, 'users', newPatientId);

      const [caregiverSnap, patientSnap] = await Promise.all([getDoc(caregiverRef), getDoc(patientRef)]);

      if (!caregiverSnap.exists() || caregiverSnap.data().role !== 'caregiver') {
        throw new Error(t('not_a_caregiver'));
      }
      if (!patientSnap.exists() || patientSnap.data().role !== 'patient') {
        throw new Error(t('invalid_patient_id'));
      }

      const related = caregiverSnap.data().related_ids || [];
      if (related.includes(newPatientId)) {
        throw new Error(t('patient_already_linked'));
      }

      await updateDoc(caregiverRef, {
        related_ids: arrayUnion(newPatientId),
      });

      const { name, email, phone, identity } = patientSnap.data();
      const decryptedIdentity = identity ? decryptIdentity(identity) : '未知';
      const maskedName = name
        ? name.charAt(0) +
          '*'.repeat(Math.max(0, name.length - 2)) +
          (name.length > 1 ? name.charAt(name.length - 1) : '')
        : '未知';

      const newPatientDetail = {
        index: (caregiverSnap.data().related_ids || []).length + 1,
        name: maskedName,
        email,
        phone,
        identity: decryptedIdentity ? decryptedIdentity.slice(-5) : '未知',
      };

      // 查詢 tasks
      const q = query(collection(db, 'tasks'), where('patient_id', '==', newPatientId));
      const querySnapshot = await getDocs(q);
      const taskList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setPatients((prev) => ({ ...prev, [newPatientId]: newPatientDetail }));
      setPatientTasks((prev) => ({ ...prev, [newPatientId]: taskList }));
      setTasks((prev) => [...prev, ...taskList]);

      setNewPatientId('');
      setShowModal(false);
      alert(t('patient_added_success'));
    } catch (err) {
      console.error('Error adding patient:', err.message);
      setPatientError(err.message || t('failed_to_add_patient'));
    }
  };

  const openModal = () => {
    setShowModal(true);
    setPatientError(null);
    const modalEl = document.getElementById('addPatientModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  };

  const closeModal = () => {
    setShowModal(false);
    setNewPatientId('');
    const modalEl = document.getElementById('addPatientModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
  };

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    const modalEl = document.getElementById('taskModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  };

  const goBackToList = () => {
    navigate('/caregiver');
  };

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      <h2 className="text-center mb-4">{t('caregiver_dashboard')}</h2>
      {loading && <div className="text-center p-5">{t('loading')}</div>}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      {/* 新增個案按鈕 */}
      <button className="btn btn-primary mb-4" onClick={openModal} disabled={loading}>
        {t('add_patient') || '新增個案'}
      </button>

      {/* 新增個案 Modal */}
      <div className="modal fade" id="addPatientModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t('add_patient')}</h5>
              <button type="button" className="btn-close" onClick={closeModal}></button>
            </div>
            <div className="modal-body">
              {patientError && <div className="alert alert-danger">{patientError}</div>}
              <form onSubmit={handleAddPatient}>
                <div className="mb-3">
                  <label htmlFor="patientId" className="form-label">{t('patient_id')}</label>
                  <input
                    type="text"
                    className="form-control"
                    id="patientId"
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {t('submit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 個案任務 Modal */}
      <div className="modal fade" id="taskModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t('patient_task_details')}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              {selectedPatientId && patients[selectedPatientId] && (
                <>
                  <h4>{patients[selectedPatientId].name}</h4>

                  {/* 任務 */}
                  <h5>{t('task_reminders')}</h5>
                  <ul className="list-group mb-3">
                    {patientTasks[selectedPatientId] && patientTasks[selectedPatientId].length > 0 ? (
                      patientTasks[selectedPatientId].map((task) => (
                        <li key={task.id} className="list-group-item">
                          {task.description} | 狀態: {t(`task_${task.status}`)}
                          {task.guide && <p className="mb-0 small">{t('care_guidelines')}: {task.guide}</p>}
                          <p className="mb-0 small">{t('task_progress')}: {task.progress||0}</p>
                        </li>
                      ))
                    ) : (
                      <li className="list-group-item">{t('no_tasks')}</li>
                    )}
                  </ul>

                  {/* 表單 */}
                  <h5>{t('assigned_forms')}</h5>
                  <ul className="list-group">
                    {patientForms[selectedPatientId] && patientForms[selectedPatientId].length > 0 ? (
                      patientForms[selectedPatientId].map((form) => (
                        <li key={form.id} className="list-group-item">
                          {form.formQuestion.title || '未命名表單'} | 狀態: {form.completed ? t('form_completed') : t('form_not_completed')}
                        </li>
                      ))
                    ) : (
                      <li className="list-group-item">{t('no_forms')}</li>
                    )}
                  </ul>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 個案列表 */}
      <h3>{t('patients')}</h3>
      {Object.keys(patients).length === 0 && !loading && (
        <div className="alert alert-info text-center">{t('no_patients')}</div>
      )}
      {Object.keys(patients)
        .sort((a, b) => patients[a].index - patients[b].index)
        .map((patientId) => (
          <div key={patientId} className="card mb-2">
            <div className="card-body" onClick={() => handlePatientClick(patientId)}>
              {t('case')} {patients[patientId].index}: {patients[patientId].name}<br />
              {t('contact_email')}: {patients[patientId].email}<br />
              {t('contact_phone')}: {patients[patientId].phone}<br />
              {t('identity_last_5')}: {patients[patientId].identity}
            </div>
          </div>
        ))}

      {/* 全部任務列表 */}
      {tasks.length > 0 && (
        <div className="mt-4">
          <h3>{t('all_tasks')}</h3>
          <ul className="list-group">
            {tasks.map((task) => (
              <li key={task.id} className="list-group-item">
                <h5>{task.description}</h5>
                <p className="mb-0 small">
                  {t('patient_id')}: {task.patient_id} | {t('status')}: {task.status}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
