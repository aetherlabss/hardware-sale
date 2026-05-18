const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

// This uses the web SDK so we don't need the service account credentials of the cloud,
// just the web config we already extracted earlier!
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
const pass = "MatrixAdmin@2026!#" + Math.floor(Math.random()*999);

createUserWithEmailAndPassword(auth, email, pass)
  .then((userCredential) => {
    console.log("SUCCESS_CREATED");
    console.log("EMAIL: " + email);
    console.log("PASS: " + pass);
    process.exit(0);
  })
  .catch((error) => {
    console.error("ERROR: ", error.code, error.message);
    process.exit(1);
  });
