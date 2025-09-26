import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBq1BjItK95Kgc3KfmuJV7aqNRQfZw9C0E",
  authDomain: "aihealth-893d7.firebaseapp.com",
  projectId: "aihealth-893d7",
  storageBucket: "aihealth-893d7.firebasestorage.app",
  messagingSenderId: "1079976146619",
  appId: "1:1079976146619:web:ebdc958a417943f8191b9e",
  measurementId: "G-X9P6HSGNEZ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app, "us-central1");

export { app, analytics, db, auth, storage, functions };