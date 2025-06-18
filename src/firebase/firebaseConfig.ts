
// TODO: Replace with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#available-libraries

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace ALL of the placeholder values below with your
// actual Firebase project's configuration details.
// You can find these in your Firebase project console:
// Project settings (gear icon) > General tab > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID_HERE.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_PROJECT_ID_HERE.appspot.com", // Or YOUR_PROJECT_ID_HERE.firebasestorage.app if that's what your console shows
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
  // measurementId: "YOUR_MEASUREMENT_ID_HERE" // Optional: for Google Analytics
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
