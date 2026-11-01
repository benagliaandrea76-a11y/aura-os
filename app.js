import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Configurazione Firebase ufficiale del tuo progetto
const firebaseConfig = {
  apiKey: "AIzaSyC7ISH8BT5Jtx5G7l1IxdAk7S7TfNw6p4k",
  authDomain: "aura-os-e579b.firebaseapp.com",
  projectId: "aura-os-e579b",
  storageBucket: "aura-os-e579b.firebasestorage.app",
  messagingSenderId: "164154800205",
  appId: "1:164154800205:web:93d394e8bfd46ce1474404",
  measurementId: "G-2M0Y961TT1"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {

    // 1. Gestione Auth State (Mostra l'app o il login)
    onAuthStateChanged(auth, async (user) => {
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');

        if (user) {
            if (authScreen) authScreen.style.display = 'none';
            if (mainApp) mainApp.style.display = 'flex';
            
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const displaySport = document.getElementById('display-sport');
                    const sportSelect = document.getElementById('sport-select');
                    const userWeight = document.getElementById('user-weight');
                    const userHeight = document.getElementById('user-height');

                    if (displaySport) displaySport.innerText = data.sport || "Atleta";
                    if (sportSelect) sportSelect.value = data.sport || "";
                    if (userWeight) userWeight.value = data.weight || "";
                    if (userHeight) userHeight.value = data.height || "";
                }
            } catch (e) {
                console.error("Errore nel recupero dati utente:", e);
            }
        } else {
            if (authScreen) authScreen.style.display = 'flex';
            if (mainApp) mainApp.style.display = 'none';
        }
    });

    // 2. Navigazione tra le tab (Sidebar e Mobile Bottom Nav)
    const allNavItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    allNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabIndex = item.getAttribute('data-tab');
            if (!tabIndex) return;

            allNavItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            document.querySelectorAll(`[data-tab="${tabIndex}"]`).forEach(i => i.classList.add('active'));
            const targetTab = document.getElementById(`tab-${tabIndex}`);
            if (targetTab) targetTab.classList.add('active');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // 3. Chat AI Coach & Suggerimenti Rapidi
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box');

    window.sendSuggestion = function(text) {
        if (userInput) {
            userInput.value = text;
            sendMessage();
        }
    };

    function sendMessage() {
        if (!userInput || !chatBox) return;
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

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // 4. Salvataggio Impostazioni Profilo
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user) {
                const sport = document.getElementById('sport-select')?.value || "";
                const weight = document.getElementById('user-weight')?.value || "";
                const height = document.getElementById('user-height')?.value || "";

                try {
                    await setDoc(doc(db, "users", user.uid), { sport, weight, height }, { merge: true });
                    const displaySport = document.getElementById('display-sport');
                    if (displaySport) displaySport.innerText = sport;
                    alert('Impostazioni salvate sul cloud Firebase!');
                } catch (error) {
                    alert("Errore durante il salvataggio: " + error.message);
                }
            }
        });
    }

    // 5. Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth);
        });
    }
});

// Funzioni globali per Auth
window.switchAuthMode = function(mode) {
    const loginTab = document.getElementById('btn-login-tab');
    const regTab = document.getElementById('btn-register-tab');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');

    if (!loginTab || !regTab || !loginForm || !regForm) return;

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
    const email = document.getElementById('login-email')?.value;
    const pass = document.getElementById('login-password')?.value;
    if (!email || !pass) {
        alert("Inserisci email e password.");
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Errore durante l'accesso: " + error.message);
    }
};

window.handleRegister = async function() {
    const email = document.getElementById('reg-email')?.value;
    const pass = document.getElementById('reg-password')?.value;
    const sport = document.getElementById('reg-sport')?.value;
    const weight = document.getElementById('reg-weight')?.value;
    const height = document.getElementById('reg-height')?.value;

    if (!email || !pass) {
        alert("Inserisci email e password per registrarti.");
        return;
    }

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