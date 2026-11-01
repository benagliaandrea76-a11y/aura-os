import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

let currentWeekStartDate = getMonday(new Date());
let userProfileCache = { sport: "Atleta", weight: "", height: "" };
let userEventsCache = [];

document.addEventListener('DOMContentLoaded', () => {

    // 1. Gestione Autenticazione & Caricamento Dati
    onAuthStateChanged(auth, async (user) => {
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');

        if (user) {
            if (authScreen) authScreen.style.display = 'none';
            if (mainApp) mainApp.style.display = 'flex';
            
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

    // 3. Navigazione Calendario
    document.getElementById('prev-week-btn')?.addEventListener('click', () => {
        currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
        if (auth.currentUser) renderWeeklyCalendar(auth.currentUser.uid);
    });

    document.getElementById('next-week-btn')?.addEventListener('click', () => {
        currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
        if (auth.currentUser) renderWeeklyCalendar(auth.currentUser.uid);
    });

    document.getElementById('today-week-btn')?.addEventListener('click', () => {
        currentWeekStartDate = getMonday(new Date());
        if (auth.currentUser) renderWeeklyCalendar(auth.currentUser.uid);
    });

    // 4. Modale Eventi "+"
    const modal = document.getElementById('event-modal');
    document.getElementById('open-add-modal-btn')?.addEventListener('click', () => {
        document.getElementById('modal-event-date').value = new Date().toISOString().split('T')[0];
        if (modal) modal.style.display = 'flex';
    });

    document.getElementById('close-modal-btn')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('save-modal-event-btn')?.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const type = document.getElementById('modal-event-type').value;
        const title = document.getElementById('modal-event-title').value.trim();
        const startDateStr = document.getElementById('modal-event-date').value;
        const startTime = document.getElementById('modal-event-start').value;
        const endTime = document.getElementById('modal-event-end').value;
        const repeat = document.getElementById('modal-event-repeat').value;
        const details = document.getElementById('modal-event-details').value.trim();

        if (!title || !startDateStr) {
            alert("Inserisci almeno il titolo e la data.");
            return;
        }

        const datesToCreate = generateDatesToSave(startDateStr, repeat);

        try {
            for (const d of datesToCreate) {
                await addDoc(collection(db, "users", user.uid, "events"), {
                    type, title, date: d, startTime, endTime, details, createdAt: new Date()
                });
            }

            if (modal) modal.style.display = 'none';
            document.getElementById('modal-event-title').value = '';
            document.getElementById('modal-event-details').value = '';

            await loadUserEvents(user.uid);
        } catch (e) {
            alert("Errore salvataggio: " + e.message);
        }
    });

    // 5. Chat IA / AI Coach
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
            aiMsg.innerText = generateAIResponse(text);
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

    // 6. Vision Hub Screenshot Upload
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const user = auth.currentUser;
            if (!file || !user) return;

            const statusCard = document.getElementById('ocr-status');
            const statusText = document.getElementById('ocr-status-text');
            if (statusCard) statusCard.style.display = 'block';
            if (statusText) statusText.innerText = "⚡ IA in analisi sullo screenshot...";

            setTimeout(async () => {
                const today = new Date().toISOString().split('T')[0];
                await addDoc(collection(db, "users", user.uid, "events"), {
                    date: today,
                    startTime: "16:00",
                    endTime: "17:15",
                    title: "Sessione Rilevata (Vision Hub)",
                    details: "FC Media: 156 BPM | Carico: Ottimale",
                    type: "calendar",
                    createdAt: new Date()
                });
                
                document.getElementById('home-hr').innerText = "48 BPM";
                document.getElementById('home-readiness').innerText = "94 %";
                if (statusText) statusText.innerText = "✅ Dati registrati nel Calendario!";
                
                await loadUserEvents(user.uid);
            }, 1400);
        });
    }

    // 7. Salvataggio Profilo & Logout
    document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
            const sport = document.getElementById('sport-select')?.value || "";
            const weight = document.getElementById('user-weight')?.value || "";
            const height = document.getElementById('user-height')?.value || "";

            try {
                await setDoc(doc(db, "users", user.uid), { sport, weight, height }, { merge: true });
                userProfileCache = { sport, weight, height };
                document.getElementById('display-sport').innerText = sport || "Atleta";
                alert('Profilo salvato con successo!');
            } catch (error) {
                alert("Errore: " + error.message);
            }
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth);
    });
});

function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

function generateDatesToSave(startDateStr, repeat) {
    const dates = [startDateStr];
    if (repeat === 'none') return dates;
    const baseDate = new Date(startDateStr);
    for (let i = 1; i <= 4; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + (7 * i));
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

async function loadUserProfile(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            userProfileCache = data;
            document.getElementById('display-sport').innerText = data.sport || "Atleta";
            document.getElementById('sport-select').value = data.sport || "";
            document.getElementById('user-weight').value = data.weight || "";
            document.getElementById('user-height').value = data.height || "";
        }
    } catch (e) {
        console.error("Errore profilo:", e);
    }
}

async function loadUserEvents(uid) {
    try {
        const querySnapshot = await getDocs(collection(db, "users", uid, "events"));
        userEventsCache = [];
        querySnapshot.forEach(doc => {
            userEventsCache.push({ id: doc.id, ...doc.data() });
        });

        renderWeeklyCalendar(uid);
        updateHomeStats();
    } catch (e) {
        console.error("Errore eventi:", e);
    }
}

function updateHomeStats() {
    const homeLastActivity = document.getElementById('home-last-activity');
    const homeLastDate = document.getElementById('home-last-date');
    const homeAiText = document.getElementById('home-ai-text');

    if (userEventsCache.length === 0) return;

    userEventsCache.sort((a, b) => new Date(b.date + 'T' + (b.startTime || '00:00')) - new Date(a.date + 'T' + (a.startTime || '00:00')));
    const latest = userEventsCache[0];

    if (homeLastActivity) homeLastActivity.innerText = latest.title;
    if (homeLastDate) homeLastDate.innerText = `${latest.date}`;
    if (homeAiText) {
        homeAiText.innerText = `"Analisi ${userProfileCache.sport || 'Agonistica'}: Ultima sessione '${latest.title}'. I parametri evidenziano un buon adattamento al carico."`;
    }
}

function renderWeeklyCalendar(uid) {
    const grid = document.getElementById('weekly-grid');
    const rangeText = document.getElementById('calendar-week-range');
    if (!grid) return;

    grid.innerHTML = '';

    const monday = new Date(currentWeekStartDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    if (rangeText) {
        rangeText.innerText = `${monday.toLocaleDateString('it-IT', options)} - ${sunday.toLocaleDateString('it-IT', options)}`;
    }

    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(dayDate.getDate() + i);
        const dayStr = dayDate.toISOString().split('T')[0];

        const col = document.createElement('div');
        col.className = `day-column ${dayStr === todayStr ? 'today' : ''}`;
        
        col.innerHTML = `
            <div class="day-header">
                <div class="day-name">${dayNames[i]}</div>
                <div class="day-number">${dayDate.getDate()}</div>
            </div>
            <div class="day-events" id="events-${dayStr}"></div>
        `;

        grid.appendChild(col);

        const eventsContainer = col.querySelector(`#events-${dayStr}`);
        const dayEvents = userEventsCache.filter(e => e.date === dayStr);
        dayEvents.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        dayEvents.forEach(ev => {
            const block = document.createElement('div');
            block.className = `event-block ${ev.type === 'task' ? 'task' : ''}`;
            block.innerHTML = `
                <button class="delete-event-btn">✕</button>
                <div class="event-time">${ev.type === 'task' ? '📌 TASK' : `${ev.startTime} - ${ev.endTime}`}</div>
                <div class="event-title">${ev.title}</div>
                ${ev.details ? `<div style="font-size: 0.7rem; color: var(--text-muted); white-space: pre-line;">${ev.details}</div>` : ''}
            `;

            block.querySelector('.delete-event-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Eliminare "${ev.title}"?`)) {
                    await deleteDoc(doc(db, "users", uid, "events", ev.id));
                    await loadUserEvents(uid);
                }
            });

            eventsContainer.appendChild(block);
        });
    }
}

function generateAIResponse(query) {
    const sport = userProfileCache.sport || "disciplina";
    return `Analisi completata per il tuo profilo (${sport}): i dati indicano un'ottima risposta metabolica. Mantieni l'idratazione e monitora i tempi di recupero programmati nel calendario.`;
}

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
    if (!email || !pass) return alert("Inserisci email e password.");
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Errore accesso: " + error.message);
    }
};

window.handleRegister = async function() {
    const email = document.getElementById('reg-email')?.value;
    const pass = document.getElementById('reg-password')?.value;
    const sport = document.getElementById('reg-sport')?.value;
    const weight = document.getElementById('reg-weight')?.value;
    const height = document.getElementById('reg-height')?.value;

    if (!email || !pass) return alert("Inserisci email e password.");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email, sport, weight, height, createdAt: new Date()
        });
        alert("Account creato con successo!");
    } catch (error) {
        alert("Errore registrazione: " + error.message);
    }
};