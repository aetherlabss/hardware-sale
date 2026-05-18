const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, updatePassword } = require('firebase/auth');
const crypto = require('crypto');

const firebaseConfig = {
  apiKey: "AIzaSyBIMZisT2zXWYfEIAwJjhPxWuQLNJE5qrk",
  authDomain: "hardware-sale.firebaseapp.com",
  projectId: "hardware-sale",
  storageBucket: "hardware-sale.firebasestorage.app",
  messagingSenderId: "655450180472",
  appId: "1:655450180472:web:0956778453eac1ab5fd68d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const email = "abdul@admin.hardwaresale.co.mz";
const oldPass = "MatrixAdmin@2026!#847"; // the one we previously set

// Generate an AES-256 equivalent random key (32 bytes = 64 hex chars)
const newPass = crypto.randomBytes(32).toString('hex');

signInWithEmailAndPassword(auth, email, oldPass)
  .then((userCredential) => {
    updatePassword(userCredential.user, newPass)
      .then(() => {
        console.log("SUCCESS_PASSWORD_UPDATED");
        console.log("NEW_AES_KEY_PASSWORD: " + newPass);
        process.exit(0);
      })
      .catch((error) => {
         console.error("ERROR_UPDATE: ", error.code, error.message);
         process.exit(1);
      });
  })
  .catch((error) => {
    console.error("ERROR_LOGIN: ", error.code, error.message);
    process.exit(1);
  });
