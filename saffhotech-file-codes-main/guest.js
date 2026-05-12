import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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

// --- 2. SESSION PARAMETERS ---
const params = new URLSearchParams(window.location.search);
const roomID = params.get('room');
const sessionKey = params.get('key');

if (!roomID || !sessionKey) {
    alert("Invalid Access: Missing Session Credentials");
    window.location.href = "about:blank";
}

const roomRef = ref(db, `rooms/${roomID}`);
let countdownInterval = null;

// --- 3. LIVE DATA SYNC ---
onValue(roomRef, (snapshot) => {
    const data = snapshot.val();

    if (!data || data.sessionID !== sessionKey) {
        alert("Session Terminated by Admin.");
        window.location.reload();
        return;
    }

    const checkOutDisplay = document.getElementById('checkOutDisplay');
    if (checkOutDisplay) checkOutDisplay.innerText = data.checkOutTime;

    const guestNameDisplay = document.getElementById('guestNameDisplay');
    if (guestNameDisplay) guestNameDisplay.innerText = data.guestName || "Guest";

    const lightStatus = document.getElementById('lightStatus');
    if (lightStatus) {
        lightStatus.innerText = data.lighting === 'ON' ? 'Active' : 'Inactive';
        lightStatus.classList.toggle('text-blue-500', data.lighting === 'ON');
    }

    const entrySection = document.getElementById('entrySection');
    const mainContent = document.getElementById('mainContent');

    if (entrySection && mainContent) {
        entrySection.classList.toggle('hidden', !data.isDoorLocked);
        mainContent.classList.toggle('hidden', data.isDoorLocked);
    }

    startCountdown(data.checkOutTime);
});

// --- 4. TIMER ENGINE ---
function startCountdown(target) {
    if (countdownInterval) clearInterval(countdownInterval);
    if (!target) return;

    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;

    function updateTimer() {
        const now = new Date();
        const [h, m] = target.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);

        if (targetDate < now) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const diff = targetDate - now;

        if (diff <= 0) {
            timerDisplay.innerHTML = `<span class="text-red-500 text-2xl font-black">EXPIRED</span>`;
            clearInterval(countdownInterval);
            return;
        }

        const ss = Math.floor((diff / 1000) % 60);
        const mm = Math.floor((diff / (1000 * 60)) % 60);
        const hh = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const dd = Math.floor((diff / (1000 * 60 * 60 * 24)) % 30);
        const mo = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));

        let html = "";
        const createUnit = (val, label, isPrimary = false) => `
            <div class="flex flex-col items-center">
                <span class="text-3xl font-black ${isPrimary ? 'text-blue-500' : 'text-white'}">
                    ${val.toString().padStart(2, '0')}
                </span>
                <span class="text-[8px] uppercase font-bold text-slate-400 mt-1">${label}</span>
            </div>
        `;

        if (mo > 0) html += createUnit(mo, "Mon");
        if (dd > 0 || mo > 0) html += createUnit(dd, "Day");
        html += createUnit(hh, "Hrs");
        html += createUnit(mm, "Min");
        html += createUnit(ss, "Sec", true);

        timerDisplay.innerHTML = `<div class="flex gap-4">${html}</div>`;
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}

// --- 5. GUEST ACTIONS (EXPOSED TO WINDOW) ---

window.showExtendPopup = () => {
    Swal.fire({
        background: '#0f172a',
        color: '#ffffff',
        title: 'EXTEND STAY',
        text: "Request a 1-hour extension?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f97316',
        confirmButtonText: 'SEND REQUEST',
        customClass: { popup: 'rounded-[2rem] border border-slate-800' }
    }).then((result) => {
        if (result.isConfirmed) {
            const guestName = document.getElementById('guestNameDisplay')?.innerText || "Guest";

            update(ref(db, `rooms/${roomID}/serviceRequests/Extend_Time`), {
                status: "pending",
                hoursToAdd: 1,
                guestName: guestName,
                timestamp: Date.now()
            }).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'SENT',
                    text: 'Wait for staff approval.',
                    background: '#0f172a',
                    color: '#fff',
                    timer: 2000,
                    showConfirmButton: false
                });
            });
        }
    });
};

// Map the HTML click to the popup function
window.requestExtension = window.showExtendPopup;

window.unlockDoor = () => {
    update(roomRef, { isDoorLocked: false, lighting: 'ON' }).catch(err => console.error(err));
};

window.toggleLight = () => {
    const lightElement = document.getElementById('lightStatus');
    const statusText = lightElement ? lightElement.innerText : 'Inactive';
    update(roomRef, { lighting: statusText === 'Inactive' ? 'ON' : 'OFF' });
};

window.guestCheckOut = () => {
    if (confirm("End your stay?")) {
        update(roomRef, { status: 'Checked-out' });
        update(ref(db, `rooms/${roomID}/serviceRequests`), { CHECKOUT: true });
    }
};

window.requestService = (serviceType) => {
    update(ref(db, `rooms/${roomID}/serviceRequests`), { [serviceType]: true })
        .then(() => {
            alert(`${serviceType} Request Sent!`);
        });
};