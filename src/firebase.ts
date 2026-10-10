// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBkCJIn2yVSExsuDf07odzDPOYLZiLw4qE",
  authDomain: "nutrition-ai-afb34.firebaseapp.com",
  projectId: "nutrition-ai-afb34",
  storageBucket: "nutrition-ai-afb34.firebasestorage.app",
  messagingSenderId: "363337453617",
  appId: "1:363337453617:web:6322f3336f2bdef0018510",
  measurementId: "G-2BGYFCVCVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;







