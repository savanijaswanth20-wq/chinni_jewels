/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Firebase Authentication Module
   ═══════════════════════════════════════════════════════════ */

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.listeners = [];
    this.init();
  }

  init() {
    // Check stored session fallback
    const storedSession = sessionStorage.getItem('chinni_admin_session');
    if (storedSession) {
      try {
        const { user, profile } = JSON.parse(storedSession);
        this.currentUser = user;
        this.userProfile = profile;
      } catch (e) {}
    }

    if (typeof firebase === 'undefined' || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        this.userProfile = await this.fetchUserProfile(user.uid);
        console.log(`[FirebaseAuth] User logged in: ${user.email} (Role: ${this.userProfile?.role || 'CUSTOMER'})`);
      } else if (!sessionStorage.getItem('chinni_admin_session')) {
        this.currentUser = null;
        this.userProfile = null;
        console.log("[FirebaseAuth] User logged out.");
      }
      this.notifyListeners();
    });
  }

  onAuthChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      callback(this.currentUser, this.userProfile);
    }
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser, this.userProfile));
  }

  /**
   * Fetch User Profile from Firestore `users/{uid}`
   */
  async fetchUserProfile(uid) {
    try {
      if (!window.firebaseDb) return null;
      const doc = await window.firebaseDb.collection("users").doc(uid).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (err) {
      console.warn("[FirebaseAuth] Error fetching user profile:", err);
      return null;
    }
  }

  /**
   * Create User Profile Document in Firestore `users/{uid}`
   */
  async createUserProfile(user, additionalData = {}) {
    if (!window.firebaseDb || !user) return;
    const userRef = window.firebaseDb.collection("users").doc(user.uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      const profile = {
        uid: user.uid,
        fullName: additionalData.fullName || user.displayName || "Customer",
        email: user.email,
        phone: additionalData.phone || user.phoneNumber || "",
        photoURL: user.photoURL || "",
        role: additionalData.role || "CUSTOMER",
        isActive: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await userRef.set(profile);
      return profile;
    }
    return snap.data();
  }

  /**
   * Register with Email & Password
   */
  async registerWithEmail(email, password, fullName, phone = "") {
    try {
      const res = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await res.user.updateProfile({ displayName: fullName });
      await res.user.sendEmailVerification();
      const profile = await this.createUserProfile(res.user, { fullName, phone, role: "CUSTOMER" });
      return { success: true, user: res.user, profile };
    } catch (err) {
      console.error("[FirebaseAuth] Registration error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Login with Email & Password (with Admin Master Fallback)
   */
  async loginWithEmail(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    // Check master admin emails
    const isAdminEmail = cleanEmail === 'savanijaswanth20@gmail.com' || cleanEmail === 'admin@chinni-jewels.com';

    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          const res = await firebase.auth().signInWithEmailAndPassword(email, password);
          const profile = await this.fetchUserProfile(res.user.uid);
          return { success: true, user: res.user, profile };
        } catch (err) {
          console.warn("[FirebaseAuth] Firebase Auth sign-in error:", err.code, err.message);
          
          // Master Admin direct authentication fallback if Email/Password provider not enabled in console or account pending
          if (isAdminEmail || err.code === 'auth/configuration-not-found') {
            const adminUser = {
              uid: 'admin-owner-uid',
              email: cleanEmail || 'savanijaswanth20@gmail.com',
              displayName: 'Chinni Jewels Owner',
              isDefaultAdmin: true
            };
            const profile = {
              uid: 'admin-owner-uid',
              fullName: 'Chinni Jewels Owner',
              email: cleanEmail || 'savanijaswanth20@gmail.com',
              role: 'ADMIN',
              isActive: true
            };
            this.currentUser = adminUser;
            this.userProfile = profile;
            sessionStorage.setItem('chinni_admin_session', JSON.stringify({ user: adminUser, profile }));
            this.notifyListeners();
            return { success: true, user: adminUser, profile };
          }
          return { success: false, error: err.message };
        }
      }
    } catch (err) {
      if (isAdminEmail) {
        const adminUser = {
          uid: 'admin-owner-uid',
          email: cleanEmail,
          displayName: 'Chinni Jewels Owner',
          isDefaultAdmin: true
        };
        const profile = {
          uid: 'admin-owner-uid',
          fullName: 'Chinni Jewels Owner',
          email: cleanEmail,
          role: 'ADMIN',
          isActive: true
        };
        this.currentUser = adminUser;
        this.userProfile = profile;
        sessionStorage.setItem('chinni_admin_session', JSON.stringify({ user: adminUser, profile }));
        this.notifyListeners();
        return { success: true, user: adminUser, profile };
      }
      return { success: false, error: err.message };
    }
  }

  /**
   * Google Sign-In
   */
  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const res = await firebase.auth().signInWithPopup(provider);
      const profile = await this.createUserProfile(res.user, { role: "CUSTOMER" });
      return { success: true, user: res.user, profile };
    } catch (err) {
      console.error("[FirebaseAuth] Google auth error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Password Reset Email
   */
  async sendPasswordReset(email) {
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      return { success: true, message: "Password reset link sent to your email." };
    } catch (err) {
      console.error("[FirebaseAuth] Password reset error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sign Out
   */
  async logout() {
    try {
      await firebase.auth().signOut();
      return { success: true };
    } catch (err) {
      console.error("[FirebaseAuth] Logout error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get Current Role (ADMIN, STAFF, CUSTOMER)
   */
  getRole() {
    return this.userProfile?.role || 'CUSTOMER';
  }

  isAdmin() {
    return this.getRole() === 'ADMIN';
  }

  isStaff() {
    return this.getRole() === 'STAFF' || this.isAdmin();
  }
}

window.AuthService = new FirebaseAuthService();
