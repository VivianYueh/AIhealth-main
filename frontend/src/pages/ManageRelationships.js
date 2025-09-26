import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ManageRelationships({ user }) {
  const { t } = useTranslation();
  const [relatedUsers, setRelatedUsers] = useState([]);
  const [newRelatedUid, setNewRelatedUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !user.uid) return;

    const fetchRelatedUsers = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          throw new Error('用戶文檔不存在');
        }
        const userData = userDoc.data();
        const relatedIds = userData.related_ids || [];
        console.log('Related IDs:', relatedIds);

        // 獲取關聯用戶資訊
        const relatedUsersQuery = query(
          collection(db, 'users'),
          where('__name__', 'in', relatedIds.length > 0 ? relatedIds : ['placeholder'])
        );
        const relatedUsersSnapshot = await getDocs(relatedUsersQuery);
        const relatedUsersList = relatedUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRelatedUsers(relatedUsersList);
      } catch (err) {
        console.error('Error fetching related users:', err.message);
        setError('無法載入關聯用戶: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedUsers();
  }, [user]);

  const addRelationship = async () => {
    if (!newRelatedUid) {
      setError('請輸入用戶 ID');
      return;
    }
    setLoading(true);
    try {
      const targetUserDoc = await getDoc(doc(db, 'users', newRelatedUid));
      if (!targetUserDoc.exists()) {
        throw new Error('目標用戶不存在');
      }
      const targetUserRole = targetUserDoc.data().role;
      const userRole = (await getDoc(doc(db, 'users', user.uid))).data().role;

      // 驗證角色配對
      if (userRole === 'patient' && targetUserRole !== 'caregiver') {
        throw new Error('個案只能新增照顧者');
      }
      if (userRole === 'caregiver' && targetUserRole !== 'patient') {
        throw new Error('照顧者只能新增個案');
      }

      // 更新雙方 users 文檔的 related_ids
      await updateDoc(doc(db, 'users', user.uid), {
        related_ids: arrayUnion(newRelatedUid)
      });
      await updateDoc(doc(db, 'users', newRelatedUid), {
        related_ids: arrayUnion(user.uid)
      });

      // 更新 tasks 和 guidelines 的 family_ids
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('patient_id', '==', userRole === 'patient' ? user.uid : newRelatedUid)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const batch = writeBatch(db);
      tasksSnapshot.forEach(doc => {
        batch.update(doc.ref, { family_ids: arrayUnion(userRole === 'caregiver' ? user.uid : newRelatedUid) });
      });

      const guidelinesQuery = query(
        collection(db, 'guidelines'),
        where('patient_id', '==', userRole === 'patient' ? user.uid : newRelatedUid)
      );
      const guidelinesSnapshot = await getDocs(guidelinesQuery);
      guidelinesSnapshot.forEach(doc => {
        batch.update(doc.ref, { family_ids: arrayUnion(userRole === 'caregiver' ? user.uid : newRelatedUid) });
      });

      await batch.commit();
      setNewRelatedUid('');
      setRelatedUsers([...relatedUsers, { id: newRelatedUid, role: targetUserRole }]);
    } catch (err) {
      console.error('Error adding relationship:', err.message);
      setError('新增關聯失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeRelationship = async (relatedUid) => {
    setLoading(true);
    try {
      // 移除雙方 users 文檔的 related_ids
      await updateDoc(doc(db, 'users', user.uid), {
        related_ids: arrayRemove(relatedUid)
      });
      await updateDoc(doc(db, 'users', relatedUid), {
        related_ids: arrayRemove(user.uid)
      });

      // 移除 tasks 和 guidelines 的 family_ids
      const userRole = (await getDoc(doc(db, 'users', user.uid))).data().role;
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('patient_id', '==', userRole === 'patient' ? user.uid : relatedUid)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const batch = writeBatch(db);
      tasksSnapshot.forEach(doc => {
        batch.update(doc.ref, { family_ids: arrayRemove(userRole === 'caregiver' ? user.uid : relatedUid) });
      });

      const guidelinesQuery = query(
        collection(db, 'guidelines'),
        where('patient_id', '==', userRole === 'patient' ? user.uid : relatedUid)
      );
      const guidelinesSnapshot = await getDocs(guidelinesQuery);
      guidelinesSnapshot.forEach(doc => {
        batch.update(doc.ref, { family_ids: arrayRemove(userRole === 'caregiver' ? user.uid : relatedUid) });
      });

      await batch.commit();
      setRelatedUsers(relatedUsers.filter(user => user.id !== relatedUid));
    } catch (err) {
      console.error('Error removing relationship:', err.message);
      setError('移除關聯失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      <h2 className="text-center mb-4">{t('manage_relationships')}</h2>
      {loading && <div className="text-center p-5">載入中...</div>}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      <div className="mb-4">
        <h5>{t('add_relationship')}</h5>
        <input
          type="text"
          className="form-control mb-2"
          value={newRelatedUid}
          onChange={(e) => setNewRelatedUid(e.target.value)}
          placeholder="輸入用戶 ID"
        />
        <button
          className="btn btn-primary"
          onClick={addRelationship}
          disabled={loading}
        >
          {t('add')}
        </button>
      </div>

      <h5 className="mb-3">{t('related_users')}</h5>
      {relatedUsers.length === 0 && !loading && (
        <div className="alert alert-info text-center">目前無關聯用戶</div>
      )}
      {relatedUsers.length > 0 && (
        <ul className="list-group">
          {relatedUsers.map(user => (
            <li key={user.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <h5>{user.id}</h5>
                <p className="mb-0 small">角色: {user.role}</p>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeRelationship(user.id)}
                disabled={loading}
              >
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}