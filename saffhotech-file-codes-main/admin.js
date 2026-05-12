
// --- AUTH GUARD ---
if (sessionStorage.getItem('admin_auth') !== 'true') {
    window.location.href = "login.html";
}

// --- 0. DYNAMIC LIBRARY LOADER ---
if (!window.Swal) {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
    document.head.appendChild(script);
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, remove, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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
const roomsRef = ref(db, 'rooms');
const menuRef = ref(db, 'menu');
const poolRef = ref(db, 'globalPoolRequests');

const ALL_HOTEL_ROOMS = ["101", "102", "103", "201", "202", "301", "302"];

// --- 2. MENU MANAGEMENT ---
onValue(menuRef, (snapshot) => {
    const localMenuCache = snapshot.val() || {};
    const list = document.getElementById('staffMenuList');
    if (!list) return;
    list.innerHTML = '';
    for (let key in localMenuCache) {
        const item = localMenuCache[key];
        const div = document.createElement('div');
        div.className = "p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center mb-2 animate-in fade-in slide-in-from-bottom-2";
        div.innerHTML = `
            <div>
                <p class="font-black text-xs uppercase text-white">${item.name}</p>
                <p class="text-blue-500 font-bold text-[10px]">₱${item.price.toFixed(2)}</p>
            </div>
            <button onclick="window.deleteMenuItem('${key}')" class="text-red-500 hover:text-red-400 px-4 transition-colors">
                <i class="fa-solid fa-trash"></i>
            </button>`;
        list.appendChild(div);
    }
});

// --- 3. DYNAMIC DROPDOWN FILTER ---
onValue(roomsRef, (snapshot) => {
    const occupiedData = snapshot.val() || {};
    const selectEl = document.getElementById('checkInRoom');
    if (!selectEl) return;
    const currentSelection = selectEl.value;
    selectEl.innerHTML = '<option value="" disabled selected>Select Room</option>';

    ALL_HOTEL_ROOMS.forEach(roomNum => {
        const isOccupied = occupiedData[roomNum] && occupiedData[roomNum].guestName;
        if (!isOccupied) {
            const option = document.createElement('option');
            option.value = roomNum;
            option.textContent = `ROOM ${roomNum}`;
            selectEl.appendChild(option);
        }
    });
    if (currentSelection) selectEl.value = currentSelection;
});

// --- 4. MAIN MONITOR ENGINE ---
onValue(roomsRef, (snapshot) => {
    const rooms = snapshot.val() || {};
    const grid = document.getElementById('adminGrid');
    const noActiveMsg = document.getElementById('noActiveRoomsText');
    if (!grid) return;

    const activeRoomIDs = [];
    const now = Date.now();

    for (let id in rooms) {
        const room = rooms[id];
        if (!room.guestName) continue;

        activeRoomIDs.push(id.toString());

        const lastSeen = room.lastSeen || 0;
        const isUserOnline = (now - lastSeen) < 30000;
        const isPendingExit = room.status === 'Checked-out';

        const timeLeft = (room.checkOutTimestamp || 0) - now;
        if (timeLeft <= 0 && room.status !== 'Available' && !isPendingExit) {
            executeFinalClear(id, room.checkOutTimestamp);
            continue;
        }

        const isWarning = timeLeft < 300000 && timeLeft > 0;
        const isLocked = room.isDoorLocked === true;
        const lightOn = room.lighting === 'ON';
        const acOn = room.aircon === 'ON';
        const checkoutDisplay = room.checkOutTimestamp ? new Date(room.checkOutTimestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "---";

        let requestHtml = '';
        if (room.serviceRequests) {
            for (let type in room.serviceRequests) {
                const orderData = room.serviceRequests[type];
                if (orderData.status !== "pending") continue;

                if (type === "Extend_Time") {
                    requestHtml += `
                    <div class="flex flex-col p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mt-2">
                        <div class="flex justify-between items-center w-full">
                            <span class="text-[10px] font-black uppercase text-orange-400">EXTEND: ${orderData.hoursToAdd}H</span>
                            <button onclick="window.viewExtension('${id}', ${orderData.hoursToAdd}, '${room.guestName}')" 
                                    class="text-[9px] font-black uppercase text-white bg-orange-600 px-4 py-1.5 rounded-lg transition-all active:scale-95 shadow-lg">
                                View Request
                            </button>
                        </div>
                    </div>`;
                } else {
                    requestHtml += `
                    <div class="flex flex-col p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-2">
                        <div class="flex justify-between items-center w-full">
                            <span class="text-[10px] font-black uppercase text-blue-400">${type.replace('_', ' ')}</span>
                            <button onclick="window.clearRequest('${id}', '${type}')" 
                                    class="text-[9px] font-black uppercase text-white bg-blue-600 px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-lg">
                                Done
                            </button>
                        </div>
                    </div>`;
                }
            }
        }

        let card = grid.querySelector(`[data-room-id="${id}"]`);
        if (!card) {
            card = document.createElement('div');
            card.setAttribute('data-room-id', id);
            grid.appendChild(card);
        }

        card.className = `p-6 rounded-[2.5rem] bg-slate-900 border-2 transition-all flex flex-col mb-4 ${isPendingExit ? 'border-orange-500 animate-pulse shadow-lg shadow-orange-500/20' :
            isWarning ? 'border-yellow-500 animate-pulse shadow-lg shadow-yellow-500/20' : 'border-slate-800'}`;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <h3 class="text-4xl font-black italic text-white">#${id}</h3>
                        <div class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                            <div class="w-1.5 h-1.5 rounded-full ${isUserOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-orange-500 shadow-[0_0_8px_#f97316]'}"></div>
                            <span class="text-[7px] font-black uppercase tracking-tighter ${isUserOnline ? 'text-green-500' : 'text-orange-500'}">${isUserOnline ? 'Live' : 'Away'}</span>
                        </div>
                    </div>
                    <p class="text-blue-500 font-black text-[10px] uppercase tracking-wider">${room.guestName}</p>
                </div>
                <div class="text-right">
                    <p class="text-slate-500 font-black text-[9px] uppercase">${isWarning ? 'EXPIRING' : isPendingExit ? 'CHECKOUT' : 'Ends'}</p>
                    <p class="text-white font-black text-[11px] leading-tight">${checkoutDisplay}</p>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="p-2 bg-slate-800 rounded-lg border ${lightOn ? 'border-yellow-500/50' : 'border-slate-700'}">
                    <p class="text-[7px] font-black text-slate-500 uppercase">Lights</p>
                    <p class="text-[9px] font-bold ${lightOn ? 'text-yellow-400' : 'text-slate-400'}">${lightOn ? 'ON' : 'OFF'}</p>
                </div>
                <div class="p-2 bg-slate-800 rounded-lg border ${acOn ? 'border-blue-500/50' : 'border-slate-700'}">
                    <p class="text-[7px] font-black text-slate-500 uppercase">Aircon</p>
                    <p class="text-[9px] font-bold ${acOn ? 'text-blue-400' : 'text-slate-400'}">${acOn ? 'ON' : 'OFF'}</p>
                </div>
                <div class="p-2 bg-slate-800 rounded-lg border ${isLocked ? 'border-red-500/50' : 'border-green-500/50'}">
                    <p class="text-[7px] font-black text-slate-500 uppercase">Door</p>
                    <p class="text-[9px] font-bold ${isLocked ? 'text-red-400' : 'text-green-400'}">${isLocked ? 'LOCKED' : 'UNLOCKED'}</p>
                </div>
            </div>

            <div class="space-y-2 mb-6">${requestHtml || '<p class="text-[9px] text-slate-700 font-black uppercase tracking-widest text-center py-2 italic">No Active Requests</p>'}</div>
            
            <div class="flex flex-wrap gap-2 mb-4">
                <button onclick="window.adminToggleDevice('${id}', 'lighting')" class="bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-white uppercase px-3 py-2 rounded-lg flex-1 transition-all active:scale-95">Lights</button>
                <button onclick="window.adminToggleDevice('${id}', 'aircon')" class="bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-white uppercase px-3 py-2 rounded-lg flex-1 transition-all active:scale-95">AC</button>
                <button onclick="window.adminToggleDevice('${id}', 'isDoorLocked')" class="bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-white uppercase px-3 py-2 rounded-lg flex-1 transition-all active:scale-95 ${isLocked ? '' : 'border border-green-500/50 text-green-400'}">
                    ${isLocked ? 'Unlock' : 'Lock'}
                </button>
            </div>

            <div class="mt-auto flex flex-col gap-2">
                ${isPendingExit ? `
                    <button onclick="window.ignoreCheckout('${id}')" 
                            class="w-full mb-2 bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 shadow-lg shadow-orange-600/20">
                        <i class="fa-solid fa-rotate-left mr-2"></i> Ignore / Recover Guest
                    </button>
                ` : ''}
                <button onclick="window.showExistingQR('${id}', '${room.sessionID}')" class="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl text-[9px] font-black text-white uppercase w-full">QR Key</button>
                <button onclick="window.handleManualTerminate('${id}', ${room.checkOutTimestamp})" class="bg-red-500/10 hover:bg-red-600 hover:text-white text-red-500 p-4 rounded-xl text-[9px] font-black uppercase w-full transition-all">
                    ${isPendingExit ? 'Confirm Checkout' : 'End Stay'}
                </button>
            </div>
        `;
    }

    grid.querySelectorAll('[data-room-id]').forEach(card => {
        if (!activeRoomIDs.includes(card.getAttribute('data-room-id'))) card.remove();
    });

    if (noActiveMsg) {
        activeRoomIDs.length === 0 ? noActiveMsg.classList.remove('hidden') : noActiveMsg.classList.add('hidden');
    }

    const countEl = document.getElementById('activeCount');
    if (countEl) countEl.innerText = activeRoomIDs.length.toString().padStart(2, '0');
});

// --- 5. FACILITY MONITORING ---
onValue(poolRef, (snapshot) => {
    const data = snapshot.val();
    const poolRequestList = document.getElementById('poolRequestList');
    const poolStatus = document.getElementById('poolStatus');

    if (!poolRequestList || !poolStatus) return;

    if (!data) {
        poolRequestList.innerHTML = `<p class="text-[9px] text-slate-600 italic uppercase text-center py-4">No Active Requests</p>`;
        poolStatus.innerText = "Clear";
        poolStatus.className = "text-[9px] font-black text-green-500 bg-green-500/10 px-3 py-1 rounded-full uppercase transition-all duration-500";
        return;
    }

    // Update Status Label with Amber Warning
    poolStatus.innerText = "Attention Required";
    poolStatus.className = "text-[9px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full uppercase animate-pulse transition-all duration-500";

    // Inject Alert Card
    poolRequestList.innerHTML = `
        <div class="bg-slate-950 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-blue-500 shadow-xl animate-in fade-in zoom-in-95">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                <span class="text-blue-500 font-black text-[10px] uppercase tracking-[0.2em]">Service Alert</span>
            </div>
            <p class="text-white text-sm font-black uppercase mb-4 tracking-tight">Need a cleaning service</p>
            <button onclick="window.clearPoolRequest()" class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 text-white shadow-lg shadow-blue-600/20">
                Mark as Cleaned
            </button>
        </div>
    `;
});

window.clearPoolRequest = () => { remove(poolRef); };

// --- 6. TERMINATION & UTILITIES ---
window.ignoreCheckout = (id) => {
    const roomRef = ref(db, `rooms/${id}`);
    update(roomRef, {
        status: "Occupied",
        isDoorLocked: false,
        lighting: "ON",
        aircon: "ON"
    }).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'ALERT RECOVERED',
            text: `Room ${id} stay has been restored.`,
            background: '#0f172a',
            color: '#fff',
            confirmButtonColor: '#2563eb'
        });
    });
};

window.viewExtension = async (id, hoursToAdd, guestName) => {
        try {
        const roomRef = ref(db, `rooms/${id}`);
        const snap = await get(roomRef);
        if (!snap.exists()) return;

        const currentData = snap.val();
        const baseTimestamp = currentData.checkOutTimestamp || Date.now();
        const newTimestamp = baseTimestamp + (hoursToAdd * 60 * 60 * 1000);

        const newTimeStr = new Date(newTimestamp).toLocaleString([], {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        Swal.fire({
            background: '#0f172a',
            color: '#ffffff',
            title: 'APPROVE EXTENSION?',
            html: `
                <div class="text-left text-xs space-y-3 p-2">
                    <p><span class="text-slate-500 uppercase font-black">Guest:</span> <span class="text-white font-bold text-sm">${guestName}</span></p>
                    <p><span class="text-slate-500 uppercase font-black">Add Hours:</span> <span class="text-orange-400 font-bold text-sm">${hoursToAdd} Hour(s)</span></p>
                    <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p class="text-blue-500 font-black uppercase text-[9px]">New Checkout Time</p>
                        <p class="text-white font-black text-lg">${newTimeStr}</p>
                    </div>
                </div>`,
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: 'APPROVE & ADD TIME',
            cancelButtonText: 'DENY REQUEST',
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#ef4444',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                update(roomRef, {
                    checkOutTimestamp: newTimestamp,
                    "serviceRequests/Extend_Time": null
                }).then(() => {
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'success',
                        title: 'Time Extended!', showConfirmButton: false, timer: 2000,
                        background: '#0f172a', color: '#fff'
                    });
                });
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                remove(ref(db, `rooms/${id}/serviceRequests/Extend_Time`)).then(() => {
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'info',
                        title: 'Extension Denied', showConfirmButton: false, timer: 2000,
                        background: '#0f172a', color: '#fff'
                    });
                });
            }
        });
    } catch (error) {
        console.error("Extension Error:", error);
    }
};

window.adminToggleDevice = async (id, field) => {
    const roomRef = ref(db, `rooms/${id}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();
    if (!data) return;
    const updates = {};
    if (field === 'isDoorLocked') {
        updates.isDoorLocked = !data.isDoorLocked;
        updates.lastAdminAction = Date.now();
    } else {
        updates[field] = data[field] === 'ON' ? 'OFF' : 'ON';
    }
    update(roomRef, updates);
};

window.handleManualTerminate = (id, timestamp) => {
    Swal.fire({
        title: 'TERMINATE SESSION?',
        text: `End stay for Room ${id}?`,
        icon: 'warning',
        showCancelButton: true,
        background: '#0f172a',
        color: '#ffffff',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'YES, END STAY'
    }).then((result) => {
        if (result.isConfirmed) executeFinalClear(id, timestamp);
    });
};

const executeFinalClear = (id, timestamp) => {
    const remaining = (timestamp || Date.now()) - Date.now();
    const h = Math.max(0, Math.floor(remaining / 3600000));
    const m = Math.max(0, Math.floor((remaining % 3600000) / 60000));
    remove(ref(db, `rooms/${id}`))
        .then(() => { window.showTerminationPopup(h, m); });
};

window.performCheckIn = async () => {
    const room = document.getElementById('checkInRoom').value;
    const name = document.getElementById('checkInName').value;
    const hours = document.getElementById('checkInHours').value;
    if (!room || !name || !hours) return;

    const checkOutTimestamp = Date.now() + (parseFloat(hours) * 60 * 60 * 1000);
    const sessionID = Math.random().toString(36).substring(2, 10).toUpperCase();

    await set(ref(db, `rooms/${room}`), {
        sessionID,
        guestName: name.toUpperCase(),
        checkOutTimestamp,
        status: "Occupied",
        lighting: "OFF",
        aircon: "OFF",
        isDoorLocked: true,
        lastSeen: Date.now(),
        lastAdminAction: Date.now()
    });
    window.showExistingQR(room, sessionID);
};

window.showExistingQR = (roomID, sessionID) => {
    const qrContainer = document.getElementById('qrContainer');

    // Dynamically gets the current origin (e.g., http://192.168.1.15:5500)
    const baseOrigin = window.location.origin;

    // Dynamically gets the current folder path to find index.html
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));

    // Construct the final URL
    const guestURL = `${baseOrigin}${path}/index.html?room=${roomID}&key=${sessionID}`;

    document.getElementById('qrRoomLabel').innerText = `ROOM ${roomID}`;
    document.getElementById('qrImage').src =
        `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(guestURL)}`;

    qrContainer.classList.remove('hidden');
};

window.clearRequest = (roomID, type) => {
    update(ref(db, `rooms/${roomID}/serviceRequests/${type}`), { status: "completed" });
};

window.showTerminationPopup = (h, m) => {
    const popup = document.createElement('div');
    popup.id = "terminationPopup";
    popup.className = "fixed inset-0 z-[500] bg-slate-950/95 flex items-center justify-center p-6 backdrop-blur-sm";
    popup.innerHTML = `
        <div class="bg-white p-12 rounded-[3rem] text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 class="text-slate-900 text-3xl font-black italic mb-2 uppercase">Terminated</h3>
            <div class="text-5xl font-black text-slate-950 mb-10">${h}h ${m}m</div>
            <button onclick="document.getElementById('terminationPopup').remove()" class="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs">Close</button>
        </div>`;
    document.body.appendChild(popup);
};

window.addMenuItem = async () => {
    const nameEl = document.getElementById('menuItemName');
    const priceEl = document.getElementById('menuItemPrice');
    if (!nameEl.value || !priceEl.value) return;

    const key = Date.now().toString();
    await set(ref(db, `menu/${key}`), {
        name: nameEl.value.toUpperCase(),
        price: parseFloat(priceEl.value)
    });
    nameEl.value = '';
    priceEl.value = '';
};

window.deleteMenuItem = (key) => {
    Swal.fire({
        title: 'SECURITY CODE',
        text: 'Type "hotelmakati" to delete:',
        input: 'text',
        showCancelButton: true,
        background: '#0f172a',
        color: '#ffffff',
        confirmButtonColor: '#ef4444',
        preConfirm: (value) => {
            if (value !== 'hotelmakati') Swal.showValidationMessage('Incorrect code');
            return value;
        }
    }).then((result) => {
        if (result.isConfirmed) remove(ref(db, `menu/${key}`));
    });
};