import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ user, role, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    // 根據角色導向正確頁面
    const rolePaths = {
      caregiver: '/caregiver',
      patient: '/user',
      family: '/family',
      therapist: '/therapist',
      doctor: '/doctor',
      hospital_admin: '/hospital-admin',
      system_admin: '/system-admin',
    };
    return <Navigate to={rolePaths[user.role] || '/login'} replace />;
  }
  return children;
}