import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, getDoc, doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as bootstrap from 'bootstrap';
import { decryptIdentity } from '../api';

// 重試事務函數
const retryTransaction = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`重試 ${i + 1}/${retries} 因: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

export default function Family({ user }) {
  console.log('Family component mounted with user:', user);
  const { t } = useTranslation();
  const [patients, setPatients] = useState({});
  const [tasks, setTasks] = useState([]);
  //const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [patientError, setPatientError] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  useEffect(() => {
    if (!user || !user.uid) {
      console.log('無用戶或 user.uid:', user);
      setError(t('please_login'));
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'family') {
          throw new Error(t('no_family_role'));
        }
        console.log('用戶角色:', userDoc.data().role);

        const relatedIds = userDoc.data().related_ids || [];
        console.log('相關個案ID:', relatedIds);
        const patientsData = {};
        for (const [index, patientId] of relatedIds.entries()) {
          const patientDoc = await getDoc(doc(db, 'users', patientId));
          console.log('Fetched patient:', patientId, 'exists:', patientDoc.exists());
          if (patientDoc.exists() && patientDoc.data().role === 'patient') {
            const { name, email, phone, identity } = patientDoc.data();
            const decryptedIdentity = identity ? decryptIdentity(identity) : '未知';
            const maskedName = name ? name.charAt(0) + '*'.repeat(Math.max(0, name.length - 2)) + (name.length > 1 ? name.charAt(name.length - 1) : '') : '未知';
            patientsData[patientId] = {
              index: index + 1,
              name: maskedName,
              email,
              phone,
              identity: decryptedIdentity ? decryptedIdentity.slice(-5) : '未知'
            };
          }
        }
        setPatients(patientsData);
        console.log('Patients fetched:', Object.keys(patientsData).length);

        if (selectedPatientId && relatedIds.includes(selectedPatientId)) {
          const taskQuery = query(collection(db, 'tasks'), where('patient_id', '==', selectedPatientId));
          const taskSnapshot = await getDocs(taskQuery);
          console.log('Tasks fetched:', taskSnapshot.size, 'empty:', taskSnapshot.empty);
          const taskList = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTasks(taskList);

          //const guidelineQuery = query(collection(db, 'guidelines'), where('patient_id', '==', selectedPatientId), where('approved', '==', true));
          //const guidelineSnapshot = await getDocs(guidelineQuery);
          //console.log('Guidelines fetched:', guidelineSnapshot.size, 'empty:', guidelineSnapshot.empty);
          //const guidelineList = guidelineSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          //setGuidelines(guidelineList);
        } else {
          setTasks([]);
          //setGuidelines([]);
        }
      } catch (err) {
        console.error('獲取資料錯誤:', err.message, err.code);
        if (err.code === 'permission-denied') {
          setError(t('no_permission'));
        } else if (err.code === 'unavailable') {
          setError(t('network_error'));
        } else if (err.code === 'invalid-argument') {
          setError(t('invalid_query'));
        } else {
          setError(t('failed_to_load_data') + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedPatientId, t]);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setPatientError(null);

    try {
      if (!newPatientId) {
        throw new Error(t('please_enter_patient_id'));
      }

      const familyRef = doc(db, 'users', user.uid);
      const patientRef = doc(db, 'users', newPatientId);

      // 外部驗證
      const [familySnap, patientSnap] = await Promise.all([
        getDoc(familyRef),
        getDoc(patientRef)
      ]);

      if (!familySnap.exists()) {
        throw new Error(t('family_data_not_exist'));
      }
      if (familySnap.data().role !== 'family') {
        throw new Error(t('not_family_role'));
      }

      if (!patientSnap.exists()) {
        throw new Error(t('patient_id_not_exist'));
      }
      if (patientSnap.data().role !== 'patient') {
        throw new Error(t('not_patient_role'));
      }

      const familyRelated = familySnap.data().related_ids || [];
      if (familyRelated.includes(newPatientId)) {
        throw new Error(t('patient_already_linked'));
      }

      // 僅更新 family 的 related_ids
      await retryTransaction(() => runTransaction(db, async (transaction) => {
        transaction.update(familyRef, {
          related_ids: arrayUnion(newPatientId)
        });
        console.log('交易已提交給 family:', user.uid, '與 patient:', newPatientId);
      }));

      // 刷新個案列表
      const updatedFamilySnap = await getDoc(familyRef);
      const relatedIds = updatedFamilySnap.data().related_ids || [];
      const patientsData = {};
      for (const [index, pid] of relatedIds.entries()) {
        const pSnap = await getDoc(doc(db, 'users', pid));
        if (pSnap.exists() && pSnap.data().role === 'patient') {
          const { name, email, phone, identity } = pSnap.data();
          const decryptedIdentity = identity ? decryptIdentity(identity) : '未知';
          const maskedName = name ? name.charAt(0) + '*'.repeat(Math.max(0, name.length - 2)) + (name.length > 1 ? name.charAt(name.length - 1) : '') : '未知';
          patientsData[pid] = {
            index: index + 1,
            name: maskedName,
            email,
            phone,
            identity: decryptedIdentity ? decryptedIdentity.slice(-5) : '未知'
          };
        }
      }
      setPatients(patientsData);

      setNewPatientId('');
      setShowModal(false);
      alert(t('patient_added_success'));
    } catch (err) {
      console.error('添加病人錯誤:', err.message, err.code, err.stack);
      setPatientError(err.message || t('failed_to_add_patient'));
    }
  };

  const openModal = () => {
    setShowModal(true);
    setPatientError(null);
    const modalEl = document.getElementById('addPatientModal');
    if (modalEl) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setNewPatientId('');
    const modalEl = document.getElementById('addPatientModal');
    if (modalEl) {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    }
  };

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    const modalEl = document.getElementById('taskModal');
    if (modalEl) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      <h2 className="text-center mb-4">{t('family_dashboard')}</h2>
      {loading && <div className="text-center p-5">{t('loading')}</div>}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      <button
        className="btn btn-primary mb-4"
        onClick={openModal}
        disabled={loading}
      >
        {t('add_patient')}
      </button>

      {/* 新增個案模態框 */}
      <div
        className="modal fade"
        id="addPatientModal"
        tabIndex="-1"
        aria-labelledby="addPatientModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="addPatientModalLabel">
                {t('add_patient')}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeModal}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {patientError && (
                <div className="alert alert-danger">{patientError}</div>
              )}
              <form onSubmit={handleAddPatient}>
                <div className="mb-3">
                  <label htmlFor="patientId" className="form-label">
                    {t('patient_id')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="patientId"
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    required
                    placeholder={t('enter_valid_id')}
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

      {/* 個案任務模態框 */}
      <div
        className="modal fade"
        id="taskModal"
        tabIndex="-1"
        aria-labelledby="taskModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="taskModalLabel">
                {t('patient_task_details')}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {selectedPatientId && patients[selectedPatientId] && (
                <>
                  <h4>{patients[selectedPatientId].name}</h4>
                  <h5>{t('task_progress')}</h5>
                  {tasks.length === 0 ? (
                    <div className="alert alert-info text-center">{t('no_task_progress')}</div>
                  ) : (
                    <ul className="list-group mb-5">
                      {tasks.map(task => (
                        <li key={task.id} className="list-group-item">
                          <h5>{task.description}</h5>
                          <p className="mb-0 small">
                            {t('patient_id')}: {task.patient_id} | {t('progress')}: {task.progress || 0}%
                          </p>
                          {task.guide && <p className="mb-0 small">{t('care_guidelines')}: {task.guide}</p>}
                        </li>
                      ))}
                    </ul>
                  )}

                  
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

      <h5 className="mb-3">{t('patients')}</h5>
      {Object.keys(patients).length === 0 && !loading && (
        <div className="alert alert-info text-center">{t('no_patients')}</div>
      )}
      {Object.keys(patients)
        .filter(patientId => patients[patientId]?.index)
        .sort((a, b) => patients[a].index - patients[b].index)
        .map(patientId => (
          <div key={patientId} className="card mb-2">
            <div className="card-body" onClick={() => handlePatientClick(patientId)}>
              {t('case')} {patients[patientId].index}: {patients[patientId].name}<br />
              {t('email')}: {patients[patientId].email}<br />
              {t('phone')}: {patients[patientId].phone}<br />
              {t('identity_last_5')}: {patients[patientId].identity}
            </div>
          </div>
        ))}
    </div>
  );
}