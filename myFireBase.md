// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxXF9aR0-ycnMLAj4Q_ByL7iJoO9obMMY",
  authDomain: "rockyaxis-shop.firebaseapp.com",
  projectId: "rockyaxis-shop",
  storageBucket: "rockyaxis-shop.firebasestorage.app",
  messagingSenderId: "554634663351",
  appId: "1:554634663351:web:b2fb104d437d351979c432",
  measurementId: "G-ETWD5T7G4T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);