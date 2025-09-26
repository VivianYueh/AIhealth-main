import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import GuestOnlyRoute from './components/GuestOnlyRoute';
import ProtectedRoute from './components/ProtectedRoute';
import useScrollSpy from './hooks/useScrollSpy';
import * as bootstrap from 'bootstrap';
import { useTranslation } from 'react-i18next';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// 新增：導入拆分的元件
import NavBar from './components/NavBar';
import MobileNavModal from './components/MobileNavModal';
import Footer from './components/Footer';

// 頁面路由
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const User = lazy(() => import('./pages/User'));
const Forgot = lazy(() => import('./pages/Forgot'));
const About = lazy(() => import('./pages/About'));
const Product = lazy(() => import('./pages/Product'));
const ESG = lazy(() => import('./pages/ESG'));
const Contact = lazy(() => import('./pages/Contact'));
const RehabDashboard = lazy(() => import('./pages/RehabDashboard'));
const Patient = lazy(() => import('./pages/Patient'));
const Caregiver = lazy(() => import('./pages/Caregiver'));
const Family = lazy(() => import('./pages/Family'));
const Therapist = lazy(() => import('./pages/Therapist'));
const Doctor = lazy(() => import('./pages/Doctor'));
const HospitalAdmin = lazy(() => import('./pages/HospitalAdmin'));
const SystemAdmin = lazy(() => import('./pages/SystemAdmin'));
const Interaction = lazy(() => import('./pages/Interaction'));
const VoiceAssistant = lazy(() => import('./pages/VoiceAssistant'));
const UserHistory = lazy(() => import('./pages/UserHistory'));
const GuestPage = lazy(() => import('./pages/GuestPage'));
const Record = lazy(() => import('./pages/Record'));
const FormFill = lazy(() => import('./pages/FormFill'));

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [manualActiveSection, setManualActiveSection] = useState(null);
  const scrollSpySection = useScrollSpy([
    'about-section',
    'feature-section',
    'esg-section',
    'contact-section',
  ]);
  const activeSection = manualActiveSection || scrollSpySection;

  useEffect(() => {
    const modalEl = document.getElementById('navModal');
    if (modalEl) {
      window.bsNavModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    }
  }, []);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = { uid: firebaseUser.uid, email: firebaseUser.email, role: userDoc.data().role };
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));

          const rolePaths = {
            caregiver: '/caregiver',
            patient: '/patient',
            family: '/family',
            therapist: '/therapist',
            doctor: '/doctor',
            hospital_admin: '/hospital-admin',
            system_admin: '/system-admin',
          };
          const currentPath = location.pathname;
          const targetPath = rolePaths[userData.role];
          if (
            targetPath &&
            currentPath !== '/' &&
            currentPath !== targetPath &&
            !Object.values(rolePaths).includes(currentPath) &&
            !currentPath.startsWith('/interaction')
          ) {
            navigate(targetPath);
          }
        } else {
          signOut(auth);
          setUser(null);
          localStorage.removeItem('user');
          navigate('/login');
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
        if (
          location.pathname.match(/^(\/caregiver|\/patient|\/family|\/therapist|\/doctor|\/hospital-admin|\/system-admin|\/rehab|\/record|\/formAssigned\/.*|\/interaction(\/.*)?$)/)
        ) {
          navigate('/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, location.pathname]);

  const closeModal = () => {
    const modalEl = document.getElementById('navModal');
    const backdrop = document.querySelector('.modal-backdrop');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
    if (backdrop) backdrop.remove();
    document.body.classList.remove('modal-open');
    document.body.style = '';
  };

  const handleNavigate = (path) => {
    closeModal();
    navigate(path);
  };

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  if (isLoading) {
    return <div className="text-center p-5">{t('loading') || '載入中...'}</div>;
  }

  return (
    <>
      <NavBar
        user={user}
        handleNavigate={handleNavigate}
        activeSection={activeSection}
        setManualActiveSection={setManualActiveSection}
      />

      <MobileNavModal
        user={user}
        handleNavigate={handleNavigate}
        handleLogout={handleLogout}
        i18n={i18n}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <Suspense fallback={<div className="text-center p-5">{t('loading') || '載入中...'}</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/product" element={<Product />} />
          <Route path="/esg" element={<ESG />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/login"
            element={
              <GuestOnlyRoute user={user} redirectTo="/user">
                <Login />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnlyRoute user={user} redirectTo="/user">
                <Register />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/user"
            element={
              <ProtectedRoute user={user}>
                <User user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rehab"
            element={
              <ProtectedRoute user={user}>
                <RehabDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient"
            element={
              <ProtectedRoute user={user}>
                <Patient user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver"
            element={
              <ProtectedRoute user={user}>
                <Caregiver user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/family"
            element={
              <ProtectedRoute user={user}>
                <Family user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapist"
            element={
              <ProtectedRoute user={user}>
                <Therapist user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute user={user}>
                <Doctor user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital-admin"
            element={
              <ProtectedRoute user={user}>
                <HospitalAdmin user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-admin"
            element={
              <ProtectedRoute user={user}>
                <SystemAdmin user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interaction"
            element={
              <ProtectedRoute user={user}>
                <Interaction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voice"
            element={
              <ProtectedRoute user={user}>
                <VoiceAssistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/record"
            element={
              <ProtectedRoute user={user}>
                <Record />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formAssigned/:formId"
            element={
              <ProtectedRoute user={user}>
                <FormFill />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/guest" element={<GuestPage />} />
        </Routes>
      </Suspense>

      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}