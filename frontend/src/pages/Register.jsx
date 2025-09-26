import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Modal, Toast, ToastContainer } from 'react-bootstrap'
import { register } from '../api'
import PrivacyPolicyModal from '../components/PrivacyPolicyModal'

export default function Register() {
  const [agreed, setAgreed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [identity, setIdentity] = useState('')
  const [countryCode, setCountryCode] = useState('+886')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleCheckboxChange = (e) => {
    setAgreed(e.target.checked)
  }

  const handleShowModal = (e) => {
    e.preventDefault()
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!agreed) {
      setShowToast(true)
      return
    }

    if (password !== passwordConfirm) {
      setError(t('invalid_password_match'))
      return
    }

    if (!/^[A-Z][1-2]\d{8}$/.test(identity)) {
      setError(t('invalid_id_format'))
      return
    }

    if (!role) {
      setError(t('invalid_role'))
      return
    }

    const fullPhone = `${countryCode}${phone}`
    if (!phone || !/^\+\d{1,4}\d{6,}$/.test(fullPhone)) {
      setError(t('invalid_phone_format'))
      return
    }

    try {
      setLoading(true)
      console.log('Submitting registration:', { email, name, role, fullPhone })
      await register(email, password, name, identity, role, fullPhone)
      setShowSuccessToast(true)
      setTimeout(() => {
        setShowSuccessToast(false)
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.message || t('register_failed'))
      console.error('Registration error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 400, position: 'relative' }}>
      <h2 className="text-center mb-4">{t('register')}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="email"
            className="form-control"
            placeholder={t('form_email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="password"
            className="form-control"
            placeholder={t('form_password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="password"
            className="form-control"
            placeholder={t('form_password_confirm')}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder={t('form_name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder={t('form_identity')}
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mb-3">
          <select
            className="form-control"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">{t('form_role_select')}</option>
            <option value="patient">{t('role_patient')}</option>
            <option value="caregiver">{t('role_caregiver')}</option>
            <option value="family">{t('role_family')}</option>
            <option value="therapist">{t('role_therapist')}</option>
            <option value="doctor">{t('role_doctor')}</option>
            <option value="hospital_admin">{t('role_hospital_admin')}</option>
            <option value="system_admin">{t('role_system_admin')}</option>
          </select>
        </div>
        <div className="form-check mb-3">
          <input
            type="checkbox"
            className="form-check-input"
            id="agreeCheck"
            checked={agreed}
            onChange={handleCheckboxChange}
          />
          <label className="form-check-label" htmlFor="agreeCheck">
            {t('form_agree_prefix')}
            <a href="#" onClick={handleShowModal}>
              {t('form_agree_link')}
            </a>
          </label>
        </div>
        <button
          type="submit"
          className="btn btn-success w-100 rounded-pill shadow-sm"
          disabled={loading}
        >
          {loading ? t('submitting') : t('register')}
        </button>
      </form>
      {error && <div className="alert alert-danger text-center my-2">{error}</div>}
      <PrivacyPolicyModal show={showModal} onClose={handleCloseModal} />
      <ToastContainer position="top-center" className="p-3">
        <Toast
          bg="success"
          onClose={() => setShowSuccessToast(false)}
          show={showSuccessToast}
          delay={2000}
          autohide
        >
          <Toast.Body className="text-white">
            {t('register_success')}
          </Toast.Body>
        </Toast>
        <Toast
          bg="warning"
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={2000}
          autohide
        >
          <Toast.Body className="text-dark">
            {t('agree_terms_required')}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  )
}