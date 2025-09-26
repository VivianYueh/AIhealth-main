import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 執行登入
      const userCredential = await login(email, password);
      //const user = userCredential.user;
      console.log('User logged in:', userCredential.uid);
      // 查詢用戶角色
      const userDoc = await getDoc(doc(db, 'users', userCredential.uid));
      console.log('User document:', userDoc);
      if (!userDoc.exists()) {
        throw new Error('用戶資料不存在');
      }
      const userData = userDoc.data();
      console.log('User data:', userData);
      const role = userData.role;
      console.log('User role:', role);
      // 根據角色跳轉
      switch (role) {
        case "caregiver":
          navigate('/caregiver');
          break;
        case "patient":
          navigate('/patient');
          break;
        case "family":
          navigate('/family');
          break;
        case "therapist":
          navigate('/therapist');
          break;
        case "doctor":
          navigate('/doctor');
          break;
        case "hospital_admin":
          navigate('/hospital-admin');
          break;
        case "system_admin":
          navigate('/system-admin');
          break;
        default:
          throw new Error('未知角色');
      }
    } catch (err) {
      setError(err.message || '登入失敗，請確認帳號與密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 400 }}>
      <h2 className="text-center mb-4">{t('login')}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="email"
            className="form-control"
            placeholder="電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="password"
            className="form-control"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100 rounded-pill shadow-sm mb-2"
          disabled={loading}
        >
          {loading ? '登入中...' : '登入'}
        </button>
      </form>
      {error && (
        <div className="alert alert-danger small text-center">{error}</div>
      )}
      <div className="text-center">
        <Link to="/register" className="d-block mb-1">沒有帳號？註冊</Link>
        <Link to="/forgot" className="text-decoration-none small">忘記密碼？</Link>
      </div>
    </div>
  );
}