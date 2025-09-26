import { Navigate } from 'react-router-dom'

export default function GuestOnlyRoute({ user, children, redirectTo = '/' }) {
  return user ? <Navigate to={redirectTo} replace /> : children
}
