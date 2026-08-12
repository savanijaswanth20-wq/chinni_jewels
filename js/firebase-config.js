/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Firebase Initialization & Configuration
   ═══════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: (window.ENV && window.ENV.VITE_FIREBASE_API_KEY) || "AIzaSyBOiAjjNDhJD_AeY1Ed4ob4gMTwp_ffwLY",
  authDomain: (window.ENV && window.ENV.VITE_FIREBASE_AUTH_DOMAIN) || "chnni-30b1b.firebaseapp.com",
  projectId: (window.ENV && window.ENV.VITE_FIREBASE_PROJECT_ID) || "chnni-30b1b",
  storageBucket: (window.ENV && window.ENV.VITE_FIREBASE_STORAGE_BUCKET) || "chnni-30b1b.firebasestorage.app",
  messagingSenderId: (window.ENV && window.ENV.VITE_FIREBASE_MESSAGING_SENDER_ID) || "536753034852",
  appId: (window.ENV && window.ENV.VITE_FIREBASE_APP_ID) || "1:536753034852:web:9ae3f8820c2532abbab171",
  measurementId: (window.ENV && window.ENV.VITE_FIREBASE_MEASUREMENT_ID) || "G-7KG58SP4Z8"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("[Firebase] Successfully initialized CHINNI JEWELS Firebase App (Project: chnni-30b1b).");
  }
  
  window.firebaseAuth = firebase.auth();
  window.firebaseDb = firebase.firestore();
  window.firebaseStorage = firebase.storage();
  window.firebaseFunctions = firebase.functions();
  if (firebase.analytics) {
    try {
      window.firebaseAnalytics = firebase.analytics();
    } catch (e) {
      console.log("[Firebase] Analytics initialization note:", e.message);
    }
  }
} else {
  console.warn("[Firebase] Firebase SDK scripts not loaded yet.");
}
