import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Firebase config (from user)
const firebaseConfig = {
  apiKey: "AIzaSyAHxHpXAmQUnk2Q2B-LBbs4do2GnEY5DkI",
  authDomain: "codecampus0707.firebaseapp.com",
  projectId: "codecampus0707",
  storageBucket: "codecampus0707.firebasestorage.app",
  messagingSenderId: "797086282554",
  appId: "1:797086282554:web:4ef7e1c51ea9e2a3db5603",
  measurementId: "G-YCWF8R8XK7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result;
};

export { auth, googleProvider };
