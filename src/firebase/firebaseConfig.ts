
// TODO: Replace with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#available-libraries

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Added for Firebase Storage

// IMPORTANT: Replace ALL of the placeholder values below with your
// actual Firebase project's configuration details.
// You can find these in your Firebase project console:
// Project settings (gear icon) > General tab > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "AIzaSyBS8JR7Hn6jRqVg5mitgoiMBHpvsfnQz6w",
  authDomain: "arrakis-atlas.firebaseapp.com",
  projectId: "arrakis-atlas",
  storageBucket: "arrakis-atlas.firebasestorage.app", // Ensure this is correct for Storage
  messagingSenderId: "713153409549",
  appId: "1:713153409549:web:1e3e92668de0a3a29cdb44"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Initialize Firebase Storage
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider }; // Export storage

