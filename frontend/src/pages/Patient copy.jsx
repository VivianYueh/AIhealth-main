import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import VoiceAssistant from './VoiceAssistant';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';

export default function User({ user }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    if (!user || !user.uid) {
      setError('請先登入');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 檢查用戶角色
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'patient') {
          throw new Error('用戶無個案角色或文檔不存在');
        }
        console.log('User role:', userDoc.data().role);

        // 查詢個案任務
        const taskQuery = query(
          collection(db, 'tasks'),
          where('patient_id', '==', user.uid)
        );
        const taskSnapshot = await getDocs(taskQuery);
        console.log('Tasks fetched:', taskSnapshot.size, 'empty:', taskSnapshot.empty);
        const taskList = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(taskList);
      } catch (err) {
        console.error('Error fetching data:', err.message, err.code);
        if (err.code === 'permission-denied') {
          setError('無權限存取資料，請確認您是否為個案角色');
        } else if (err.code === 'unavailable') {
          setError('無法連線到伺服器，請檢查網路');
        } else if (err.code === 'invalid-argument') {
          setError('查詢參數無效，請聯繫管理員');
        } else {
          setError(`無法載入資料: ${err.message} (代碼: ${err.code || '無'})`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const updateTaskProgress = async (taskId, progress) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'tasks', taskId), { progress });
      setTasks(tasks.map(task => task.id === taskId ? { ...task, progress } : task));
    } catch (err) {
      console.error('Error updating task:', err.message, err.code);
      setError('更新任務失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">{t('patient_dashboard') || '個案儀表板'}</h2>
      {loading && <div className="text-center p-5">載入中...</div>}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      {user ? (
        <>
          <h5 className="mb-3">{t('rehab_tasks') || '復健任務'}</h5>
          {tasks.length === 0 && !loading && (
            <div className="alert alert-info text-center">目前無復健任務</div>
          )}
          {tasks.length > 0 && (
            <ul className="list-group mb-5">
              {tasks.map(task => (
                <li key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h5>{task.description}</h5>
                    <p className="mb-0 small">
                      進度: {task.progress || 0}% | 個案ID: {task.patient_id}
                    </p>
                  </div>
                  <Link to={`/interaction/${task.id}`} className="btn btn-outline-primary btn-sm rounded-pill">
                    {t('perform_task') || '執行任務'}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h5 className="mb-3">{t('daily_records') || '每日記錄'}</h5>
          <div className="mb-4">
            <Link to="/record" className="btn btn-outline-primary rounded-pill">
              {t('add_record') || '新增記錄'}
            </Link>
          </div>
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
        <button
          className="btn btn-outline-dark rounded-pill d-flex align-items-center justify-content-center gap-2 mx-auto"
          onClick={() => setShowAssistant(prev => !prev)}
        >
          <FontAwesomeIcon icon={showAssistant ? faMicrophoneSlash : faMicrophone} />
          {showAssistant
            ? t('close_voice_assistant') || '關閉語音助理'
            : t('open_voice_assistant') || '開啟語音助理'}
        </button>
      </div>

      {showAssistant && (
        <div className="border rounded p-3 bg-light">
          <VoiceAssistant />
        </div>
      )}
    </div>
  );
}