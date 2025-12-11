// js/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBOwYNdXfPLi27GGK2XKe4GEDe_jH4a89k',
  authDomain: 'sport-management-f8c6e.firebaseapp.com',
  projectId: 'sport-management-f8c6e',
  storageBucket: 'sport-management-f8c6e.appspot.com',
  messagingSenderId: '606920614530',
  appId: '1:606920614530:web:cf8eaba176fc9d8d224a9b',
  measurementId: 'G-P5BEF09PME'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
console.log('Firebase initialized successfully');

