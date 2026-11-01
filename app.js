import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

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

    // Imposta la data odierna come predefinita nel modulo del calendario
    const todayInput = document.getElementById('event-date');
    if (todayInput) {
        todayInput.value = new Date().toISOString().split('T')[0];
    }

    // 1. Gestione Autenticazione Utente
    onAuthStateChanged(auth, async (user) => {
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');

        if (user) {
            if (authScreen) authScreen.style.display = 'none';
            if (mainApp) mainApp.style.display = 'flex';
            
            // Carica profilo personale e eventi dal cloud Firebase dell'utente
            await loadUserProfile(user.uid);
            await loadUserEvents(user.uid);
        } else {
            if (authScreen) authScreen.style.display = 'flex';
            if (mainApp) mainApp.style.display = 'none';
        }
    });

    // 2. Navigazione tra le Tab
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

    // 3. Aggiunta manuale di Eventi al Calendario
    const addEventBtn = document.getElementById('add-event-btn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) return;

            const date = document.getElementById('event-date').value;
            const startTime = document.getElementById('event-start-time').value;
            const endTime = document.getElementById('event-end-time').value;
            const title = document.getElementById('event-title').value.trim();
            const details = document.getElementById('event-details').value.trim();

            if (!date || !title) {
                alert("Per favore, inserisci almeno la data e il titolo dell'attività.");
                return;
            }

            try {
                await addDoc(collection(db, "users", user.uid, "events"), {
                    date,
                    startTime,
                    endTime,
                    title,
                    details,
                    createdAt: new Date()
                });

                document.getElementById('event-title').value = '';
                document.getElementById('event-details').value = '';
                alert("Evento salvato con successo nel tuo calendario!");
                
                await loadUserEvents(user.uid);
            } catch (e) {
                alert("Errore durante il salvataggio dell'evento: " + e.message);
            }
        });
    }

    // 4. Elaborazione Screenshot da Vision Hub (Estrazione AI Simulata)
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const user = auth.currentUser;
            if (!file || !user) return;

            const statusCard = document.getElementById('ocr-status');
            const statusText = document.getElementById('ocr-status-text');
            if (statusCard) statusCard.style.display = 'block';

            if (statusText) statusText.innerText = "🤖 L'AI sta analizzando lo screenshot del tuo dispositivo...";

            setTimeout(async () => {
                const today = new Date().toISOString().split('T')[0];
                const autoEvent = {
                    date: today,
                    startTime: "16:00",
                    endTime: "17:15",
                    title: "Allenamento Rilevato da Screenshot",
                    details: "FC Media: 154 BPM | Calorie: 540 kcal | Fonte: Vision Hub Analysis",
                    createdAt: new Date()
                };

                await addDoc(collection(db, "users", user.uid, "events"), autoEvent);
                
                // Aggiorna anche la home
                const hrElem = document.getElementById('home-hr');
                if (hrElem) hrElem.innerText = "52 BPM";

                const readinessElem = document.getElementById('home-readiness');
                if (readinessElem) readinessElem.innerText = "88 %";

                if (statusText) statusText.innerText = "✅ Dati estratti con successo ed inseriti nel Calendario!";
                await loadUserEvents(user.uid);
            }, 1500);
        });
    }

    // 5. Salvataggio Impostazioni Profilo
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
                    if (displaySport) displaySport.innerText = sport || "Nessun sport impostato";
                    alert('Profilo salvato correttamente!');
                } catch (error) {
                    alert("Errore durante il salvataggio: " + error.message);
                }
            }
        });
    }

    // 6. Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth);
        });
    }
});

// Carica il profilo dell'utente da Firestore
async function loadUserProfile(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const displaySport = document.getElementById('display-sport');
            const sportSelect = document.getElementById('sport-select');
            const userWeight = document.getElementById('user-weight');
            const userHeight = document.getElementById('user-height');

            if (displaySport) displaySport.innerText = data.sport || "Nessun sport impostato";
            if (sportSelect) sportSelect.value = data.sport || "";
            if (userWeight) userWeight.value = data.weight || "";
            if (userHeight) userHeight.value = data.height || "";
        }
    } catch (e) {
        console.error("Errore profilo:", e);
    }
}

// Carica la lista degli eventi del calendario dell'utente da Firestore
async function loadUserEvents(uid) {
    const container = document.getElementById('events-list-container');
    const noEventsMsg = document.getElementById('no-events-msg');
    const homeLastActivity = document.getElementById('home-last-activity');
    const homeLastDate = document.getElementById('home-last-date');

    if (!container) return;

    try {
        const q = query(collection(db, "users", uid, "events"));
        const querySnapshot = await getDocs(q);

        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        // Ordina per data decrescente
        events.sort((a, b) => new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime));

        if (events.length === 0) {
            if (noEventsMsg) noEventsMsg.style.display = 'block';
            container.innerHTML = '<p class="text-muted">Nessun evento salvato. Compila il modulo sopra per iniziare la tua programmazione.</p>';
            if (homeLastActivity) homeLastActivity.innerText = "Nessuna";
            if (homeLastDate) homeLastDate.innerText = "Aggiungi eventi al calendario.";
            return;
        }

        if (noEventsMsg) noEventsMsg.style.display = 'none';
        container.innerHTML = '';

        // Aggiorna la home con il primo evento più recente
        if (homeLastActivity && events[0]) homeLastActivity.innerText = events[0].title;
        if (homeLastDate && events[0]) homeLastDate.innerText = `${events[0].date} (${events[0].startTime} - ${events[0].endTime})`;

        events.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.marginBottom = '10px';
            card.style.borderLeft = '4px solid #00f2fe';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.1rem; color: #fff;">${ev.title}</h4>
                        <p style="margin: 4px 0; font-size: 0.85rem; color: #00f2fe;">📅 ${ev.date} | ⏰ ${ev.startTime} - ${ev.endTime}</p>
                        ${ev.details ? `<p style="margin: 8px 0 0 0; font-size: 0.9rem; color: rgba(255,255,255,0.8); whitespace: pre-line;">${ev.details}</p>` : ''}
                    </div>
                    <button class="delete-btn" style="background: transparent; border: none; color: #ff4757; cursor: pointer; font-size: 1.1rem;">🗑️</button>
                </div>
            `;

            // Aggiunge la cancellazione dell'evento
            card.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm(`Vuoi cancellare l'evento "${ev.title}"?`)) {
                    await deleteDoc(doc(db, "users", uid, "events", ev.id));
                    await loadUserEvents(uid);
                }
            });

            container.appendChild(card);
        });

    } catch (e) {
        console.error("Errore durante il caricamento degli eventi:", e);
    }
}

// Funzioni per la schermata Auth
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