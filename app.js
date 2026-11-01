import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyC7ISH8BT5Jtx5G7l1IxdAk7S7TfNw6p4k",

  authDomain: "aura-os-e579b.firebaseapp.com",

  projectId: "aura-os-e579b",

  storageBucket: "aura-os-e579b.firebasestorage.app",

  messagingSenderId: "164154800205",

  appId: "1:164154800205:web:93d394e8bfd46ce1474404",

  measurementId: "G-2M0Y961TT1"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {

    // 1. Stato Autenticazione Firebase
    onAuthStateChanged(auth, async (user) => {
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');

        if (user) {
            authScreen.style.display = 'none';
            mainApp.style.display = 'flex';
            
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById('display-sport').innerText = data.sport;
                document.getElementById('sport-select').value = data.sport;
                document.getElementById('user-weight').value = data.weight;
                document.getElementById('user-height').value = data.height;
            }
        } else {
            authScreen.style.display = 'flex';
            mainApp.style.display = 'none';
        }
    });

    // 2. Navigazione Unificata (Funziona sia su Desktop Sidebar sia su Mobile Bottom Nav)
    const allNavItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    allNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabIndex = item.getAttribute('data-tab');

            // Disattiva tutti i selettori sia PC che Mobile
            allNavItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            // Attiva gli elementi selezionati
            document.querySelectorAll(`[data-tab="${tabIndex}"]`).forEach(i => i.classList.add('active'));
            document.getElementById(`tab-${tabIndex}`).classList.add('active');

            // Scroll in alto automatico quando si cambia pagina su telefono
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // 3. AI Chat & Suggerimenti
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box');

    window.sendSuggestion = function(text) {
        userInput.value = text;
        sendMessage();
    };

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        const userMsg = document.createElement('div');
        userMsg.className = 'message user';
        userMsg.innerText = text;
        chatBox.appendChild(userMsg);

        userInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai';
            aiMsg.innerText = `Analisi completata per il tuo profilo: in merito a '${text}', i parametri indicano un'ottima risposta metabolica. Mantieni l'idratazione e monitora la frequenza cardiaca a riposo.`;
            chatBox.appendChild(aiMsg);
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 800);
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // 4. Salva Impostazioni
    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
            const sport = document.getElementById('sport-select').value;
            const weight = document.getElementById('user-weight').value;
            const height = document.getElementById('user-height').value;

            await setDoc(doc(db, "users", user.uid), { sport, weight, height }, { merge: true });
            document.getElementById('display-sport').innerText = sport;
            alert('Impostazioni salvate sul cloud Firebase!');
        }
    });

    // 5. Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth);
    });
});

window.switchAuthMode = function(mode) {
    const loginTab = document.getElementById('btn-login-tab');
    const regTab = document.getElementById('btn-register-tab');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');

    if (mode === 'login') {
        loginTab.classList.add('active');
        regTab.classList.remove('active');
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
    } else {
        regTab.classList.add('active');
        loginTab.classList.remove('active');
        regForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
};

window.handleLogin = async function() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Errore durante l'accesso: " + error.message);
    }
};

window.handleRegister = async function() {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const sport = document.getElementById('reg-sport').value;
    const weight = document.getElementById('reg-weight').value;
    const height = document.getElementById('reg-height').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email, sport, weight, height, createdAt: new Date()
        });
        
        alert("Account creato con successo!");
    } catch (error) {
        alert("Errore durante la registrazione: " + error.message);
    }
};