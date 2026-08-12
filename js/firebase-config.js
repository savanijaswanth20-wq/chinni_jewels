/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Firebase Initialization & Configuration
   ═══════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: (window.ENV && window.ENV.VITE_FIREBASE_API_KEY) || "AIzaSyDummyKeyForChinniJewelsGold2026",
  authDomain: (window.ENV && window.ENV.VITE_FIREBASE_AUTH_DOMAIN) || "chinni-jewels-gold.firebaseapp.com",
  projectId: (window.ENV && window.ENV.VITE_FIREBASE_PROJECT_ID) || "chinni-jewels-gold",
  storageBucket: (window.ENV && window.ENV.VITE_FIREBASE_STORAGE_BUCKET) || "chinni-jewels-gold.appspot.com",
  messagingSenderId: (window.ENV && window.ENV.VITE_FIREBASE_MESSAGING_SENDER_ID) || "987654321098",
  appId: (window.ENV && window.ENV.VITE_FIREBASE_APP_ID) || "1:987654321098:web:abcdef1234567890"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("[Firebase] Successfully initialized CHINNI JEWELS Firebase App.");
  }
  
  window.firebaseAuth = firebase.auth();
  window.firebaseDb = firebase.firestore();
  window.firebaseStorage = firebase.storage();
  window.firebaseFunctions = firebase.functions();
} else {
  console.warn("[Firebase] Firebase SDK scripts not loaded yet.");
}
