import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB2TDKYbe4IvV6XxgXumAckU1dgUCAi_Bs",
    authDomain: "simplechat-c7c92.firebaseapp.com",
    databaseURL: "https://simplechat-c7c92-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "simplechat-c7c92",
    storageBucket: "simplechat-c7c92.firebasestorage.app",
    messagingSenderId: "923838872623",
    appId: "1:923838872623:web:bdc7bb53d724f06de91ada"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Get URL Parameters
const urlParams = new URLSearchParams(window.location.search);
const roomID = urlParams.get('room');
const guestKey = urlParams.get('key');
const roomPath = ref(db, 'rooms/' + roomID);

let timerInterval = null;

// --- 2. MAIN REAL-TIME LISTENER ---
onValue(roomPath, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // SECURITY: Session Validation
    if (data.sessionID !== guestKey || data.status === "Available" || data.status === "Checked-out") {
        document.body.innerHTML = `
            <div class="h-screen bg-slate-900 text-white flex flex-col items-center justify-center text-center p-10">
                <div class="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <i class="fa-solid fa-clock-rotate-left text-3xl"></i>
                </div>
                <h1 class="text-4xl font-black italic mb-4 uppercase tracking-tighter">Session Expired</h1>
                <p class="text-slate-400 max-w-xs mx-auto text-sm font-bold">Your access key is no longer active. Please proceed to the front desk for assistance.</p>
            </div>`;
        if (timerInterval) clearInterval(timerInterval);
        return;
    }

    // Update UI Labels
    const roomDisplay = document.getElementById('roomDisplay');
    const entryRoomNum = document.getElementById('entryRoomNum');
    
    if (roomDisplay) roomDisplay.innerText = `Room ${roomID}`;
    if (entryRoomNum) entryRoomNum.innerText = roomID;

    // Heartbeat: Let Admin know guest is active
    update(roomPath, { 
        isOnline: true, 
        lastSeen: Date.now() 
    });

    // Update Hardware UI (Lights & AC)
    updateHardwareUI('light', data.lighting);
    updateHardwareUI('aircon', data.aircon);

    // Dashboard Visibility & Timer Logic
    const entrySection = document.getElementById('entrySection');
    const mainDashboard = document.getElementById('mainContent') || document.getElementById('mainDashboard');

    // If Admin or Guest Unlocks Door
    if (data.isDoorLocked === false) {
        if (entrySection) entrySection.classList.add('hidden');
        if (mainDashboard) mainDashboard.classList.remove('hidden');

        // Start countdown using the Timestamp from Admin
        if (data.checkOutTimestamp) {
            startCountdown(data.checkOutTimestamp);
        }
    } else {
        // Show Entry Lock Screen
        if (entrySection) entrySection.classList.remove('hidden');
        if (mainDashboard) mainDashboard.classList.add('hidden');
    }
});

// --- 3. HARDWARE UI UPDATES ---
function updateHardwareUI(type, status) {
    const label = document.getElementById(`${type}Status`);
    const iconBg = document.getElementById(`${type}IconBg`);
    const isOn = (status === "ON");

    if (label) label.innerText = isOn ? "Active" : "Inactive";

    if (iconBg) {
        const icon = iconBg.querySelector('i');
        if (isOn) {
            iconBg.className = "w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mr-4 transition-all shadow-lg shadow-blue-600/30";
            if (icon) icon.className = `fa-solid ${type === 'light' ? 'fa-lightbulb' : 'fa-snowflake'} text-xl text-white animate-pulse`;
        } else {
            iconBg.className = "w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mr-4 transition-all";
            if (icon) icon.className = `fa-solid ${type === 'light' ? 'fa-lightbulb' : 'fa-snowflake'} text-xl text-slate-500`;
        }
    }
}

// --- 4. TIMER LOGIC (Timestamp Based) ---
function startCountdown(targetTimestamp) {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const now = Date.now();
        const diff = targetTimestamp - now;

        if (diff <= 0) {
            clearInterval(timerInterval);
            const display = document.getElementById('timerDisplay');
            if (display) display.innerText = "00:00:00";
            handleAutoCheckout();
            return;
        }

        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) timerDisplay.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

// --- 5. ACTION FUNCTIONS ---

// Guest unlocks door for the first time
window.unlockDoor = async () => {
    try {
        await update(roomPath, {
            isDoorLocked: false,
            lighting: "ON",
            aircon: "ON",
            doorStatus: "Opened"
        });
    } catch (e) {
        alert("Error connecting to room hardware.");
    }
};

window.toggleLight = async () => {
    const snap = await get(roomPath);
    const current = snap.val().lighting;
    update(roomPath, { lighting: current === "ON" ? "OFF" : "ON" });
};

window.toggleAC = async () => {
    const snap = await get(roomPath);
    const current = snap.val().aircon;
    update(roomPath, { aircon: current === "ON" ? "OFF" : "ON" });
};

window.requestService = (type) => {
    update(ref(db, `rooms/${roomID}/serviceRequests/${type}`), { 
        status: "pending",
        timestamp: Date.now()
    });
    alert(`Service request for ${type} sent to staff.`);
};

window.guestCheckOut = async () => {
    if (confirm("End your stay and lock all systems?")) {
        await update(roomPath, {
            status: "Checked-out",
            lighting: "OFF",
            aircon: "OFF",
            isDoorLocked: true,
            isOnline: false
        });
        if (timerInterval) clearInterval(timerInterval);
    }
};

async function handleAutoCheckout() {
    await update(roomPath, {
        lighting: "OFF",
        aircon: "OFF",
        status: "Checked-out",
        isDoorLocked: true,
        isOnline: false
    });
}