import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { register, decryptIdentity, hashIdentity, deleteUser } from '../api';

export default function SystemAdmin({ user }) {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', identity: '', name: '', phone: '', role: '' });
  const [countryCode, setCountryCode] = useState('+886');
  const [editAccount, setEditAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 輔助函數：分離國碼和電話號碼
  const splitPhoneNumber = (fullPhone) => {
    if (!fullPhone) {
      return { countryCode: '+886', phoneNumber: '' };
    }
    const supportedCountryCodes = ['+886', '+86', '+1', '+81'];
    let matchedCountryCode = '+886'; // 預設國碼
    let phoneNumber = fullPhone;

    for (const code of supportedCountryCodes) {
      if (fullPhone.startsWith(code)) {
        matchedCountryCode = code;
        phoneNumber = fullPhone.slice(code.length);
        break;
      }
    }

    return { countryCode: matchedCountryCode, phoneNumber };
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const accountList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          const { countryCode: parsedCountryCode, phoneNumber } = splitPhoneNumber(data.phone ?? '');
          return {
            id: doc.id,
            email: data.email ?? '',
            password: data.password ?? '',
            identity: data.identity ?? '',
            name: data.name ?? '',
            countryCode: parsedCountryCode,
            phoneNumber,
            role: data.role ?? '',
          };
        });
        setAccounts(accountList);
      } catch (err) {
        setError(t('error_load_accounts'));
        console.error('載入帳號失敗:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!/^\S+@\S+\.\S+$/.test(newAccount.email)) {
        setError(t('invalid_email_format'));
        return;
      }
      if (!/^[A-Z][1-2]\d{8}$/.test(newAccount.identity)) {
        setError(t('invalid_id_format'));
        return;
      }
      const fullPhone = `${countryCode}${newAccount.phone}`;
      if (!newAccount.phone || !/^\+\d{1,4}\d{6,}$/.test(fullPhone)) {
        setError(t('invalid_phone_format'));
        return;
      }
      if (!['caregiver', 'patient', 'family', 'therapist', 'doctor', 'hospital_admin', 'system_admin'].includes(newAccount.role)) {
        setError(t('invalid_role'));
        return;
      }
      await register(
        newAccount.email,
        newAccount.password,
        newAccount.name,
        newAccount.identity,
        newAccount.role,
        fullPhone
      );
      setNewAccount({ email: '', password: '', identity: '', name: '', phone: '', role: '' });
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const accountList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let decryptedIdentity = '';
        try {
          decryptedIdentity = decryptIdentity(data.identity ?? '');
        } catch (err) {
          console.error(`解密 identity 失敗 (ID: ${doc.id}):`, err);
          decryptedIdentity = data.identity ?? '';
        }
        const { countryCode: parsedCountryCode, phoneNumber } = splitPhoneNumber(data.phone ?? '');
        return {
          id: doc.id,
          email: data.email ?? '',
          password: data.password ?? '',
          identity: decryptedIdentity,
          name: data.name ?? '',
          countryCode: parsedCountryCode,
          phoneNumber,
          role: data.role ?? '',
        };
      });
      setAccounts(accountList);
      setError(null);
    } catch (err) {
      setError(t('error_add_account', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account) => {
    console.log('編輯帳號:', account);
    // 一律嘗試解密 identity，若失敗則顯示原值
    let identity = account.identity;
    try {
      identity = decryptIdentity(identity);
    } catch (err) {
      // 若解密失敗則保留原值
      console.error('解密 identity 失敗:', err);
    }
    setEditAccount(account);
    setCountryCode(account.countryCode);
    setNewAccount({
      email: account.email ?? '',
      password: account.password ?? '',
      identity: identity ?? '',
      name: account.name ?? '',
      phone: account.phoneNumber,
      role: account.role ?? '',
    });
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!/^\S+@\S+\.\S+$/.test(newAccount.email)) {
        setError(t('invalid_email_format'));
        return;
      }
      if (!/^[A-Z][1-2]\d{8}$/.test(newAccount.identity)) {
        setError(t('invalid_id_format'));
        return;
      }
      const fullPhone = `${countryCode}${newAccount.phone}`;
      if (!newAccount.phone || !/^\+\d{1,4}\d{6,}$/.test(fullPhone)) {
        setError(t('invalid_phone_format'));
        return;
      }
      if (!['caregiver', 'patient', 'family', 'therapist', 'doctor', 'hospital_admin', 'system_admin'].includes(newAccount.role)) {
        setError(t('invalid_role'));
        return;
      }
      await updateDoc(doc(db, 'users', editAccount.id), {
        email: newAccount.email || '',
        password: newAccount.password || '',
        identity: hashIdentity(newAccount.identity) || '',
        name: newAccount.name || '',
        phone: fullPhone || '',
        role: newAccount.role || '',
      });
      setEditAccount(null);
      setNewAccount({ email: '', password: '', identity: '', name: '', phone: '', role: '' });
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const accountList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let decryptedIdentity = '';
        try {
          decryptedIdentity = decryptIdentity(data.identity ?? '');
        } catch (err) {
          console.error(`解密 identity 失敗 (ID: ${doc.id}):`, err);
          decryptedIdentity = data.identity ?? '';
        }
        const { countryCode: parsedCountryCode, phoneNumber } = splitPhoneNumber(data.phone ?? '');
        return {
          id: doc.id,
          email: data.email ?? '',
          password: data.password ?? '',
          identity: data.identity ?? '',
          name: data.name ?? '',
          countryCode: parsedCountryCode,
          phoneNumber,
          role: data.role ?? '',
        };
      });
      setAccounts(accountList);
      setError(null);
    } catch (err) {
      setError(t('error_update_account', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (window.confirm(t('confirm_delete_account'))) {
      setLoading(true);
      try {
        // 呼叫 api.js 的 deleteUser，isAdmin = true
        await deleteUser(id, true);
        setAccounts(accounts.filter(account => account.id !== id));
        setError(null);
      } catch (err) {
        setError(t('error_delete_account', { message: err.message }));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 800 }}>
      <h2 className="text-center mb-4">{t('system_admin_dashboard')}</h2>
      {loading && <div className="text-center p-5">{t('loading')}</div>}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      <h5 className="mb-3">{!editAccount ? t('add_account') : t('edit_account')}</h5>
      <form onSubmit={editAccount ? handleUpdateAccount : handleAddAccount} className="mb-5">
        <div className="mb-3">
          <input
            type="email"
            className="form-control"
            placeholder={t('form_email')}
            value={newAccount.email}
            onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder={t('form_password')}
            value={newAccount.password}
            onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder={t('form_identity')}
            value={newAccount.identity}
            onChange={(e) => setNewAccount({ ...newAccount, identity: e.target.value })}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder={t('form_name')}
            value={newAccount.name}
            onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
            required
          />
        </div>
        <div className="mb-3 row gx-2">
          <div className="col-4">
            <select
              className="form-select"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              <option value="+886">+886 台灣</option>
              <option value="+86">+86 中國</option>
              <option value="+1">+1 美國</option>
              <option value="+81">+81 日本</option>
            </select>
          </div>
          <div className="col-8">
            <input
              type="tel"
              className="form-control"
              placeholder={t('form_phone')}
              value={newAccount.phone}
              onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="mb-3">
          <select
            className="form-control"
            value={newAccount.role}
            onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
            required
          >
            <option value="">{t('choose_role')}</option>
            <option value="caregiver">{t('role_caregiver')}</option>
            <option value="patient">{t('role_patient')}</option>
            <option value="family">{t('role_family')}</option>
            <option value="therapist">{t('role_therapist')}</option>
            <option value="doctor">{t('role_doctor')}</option>
            <option value="hospital_admin">{t('role_hospital_admin')}</option>
            <option value="system_admin">{t('role_system_admin')}</option>
          </select>
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100 rounded-pill shadow-sm"
          disabled={loading}
        >
          {loading ? t('processing') : (editAccount ? t('update_account') : t('add_account'))}
        </button>
        {editAccount && (
          <button
            type="button"
            className="btn btn-secondary w-100 mt-2 rounded-pill shadow-sm"
            onClick={() => {
              setEditAccount(null);
              setNewAccount({ email: '', password: '', identity: '', name: '', phone: '', role: '' });
            }}
            disabled={loading}
          >
            {t('cancel')}
          </button>
        )}
      </form>

      <h5 className="mb-3">{t('account_list')}</h5>
      {accounts.length === 0 && !loading && (
        <div className="alert alert-info text-center">{t('no_account_data')}</div>
      )}
      {accounts.length > 0 && (
        <ul className="list-group">
          {accounts.map(account => (
            <li key={account.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <h5>{account.email}</h5>
                <p className="mb-0 small">id: {account.id}</p>
                <p className="mb-0 small">{t('form_name')}: {account.name}</p>
                <p className="mb-0 small">{t('form_phone')}: {account.countryCode}{account.phoneNumber}</p>
                <p className="mb-0 small">{t('role')}: {t(`role_${account.role}`)}</p>
              </div>
              <div>
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => handleEditAccount(account)}
                  disabled={loading}
                >
                  {t('edit_account')}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteAccount(account.id)}
                  disabled={loading}
                >
                  {t('delete_account')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}