// js/logger.js
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { auth, db } from './firebase.js';

/** Simple logger — writes to console and Firestore `logs` collection */
export async function logAction(userId, action, details = {}){
  const resolvedUserId = userId ?? auth.currentUser?.uid ?? null;
  const entry = {
    userId: resolvedUserId,
    action,
    details,
    ts: serverTimestamp()
  };
  try{
    console.log('[LOG]', action, details);
    await addDoc(collection(db, 'logs'), entry);
  }catch(err){
    console.error('Failed to write log', err);
  }
}

