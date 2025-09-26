import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { resetPassword } from '../api'

export default function Forgot() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || '發送重設連結失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 400 }}>
      <h2 className="text-center mb-4">忘記密碼</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="email"
            className="form-control"
            placeholder="請輸入註冊用電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-secondary w-100 rounded-pill shadow-sm mb-3"
          disabled={loading}
        >
          {loading ? '發送中...' : '發送重設連結'}
        </button>
      </form>
      {error && <div className="alert alert-danger text-center small">{error}</div>}
      {success && (
        <div className="alert alert-success text-center small">
          重設連結已發送至您的電子郵件
        </div>
      )}
      <div className="text-center">
        <Link to="/login" className="btn btn-link small text-decoration-none">返回登入頁</Link>
      </div>
    </div>
  )
}