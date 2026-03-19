import { db } from '../firebase.js';
import { store } from '../store.js';
import { appId } from '../config.js';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { showScanResultModal, showToast, getTodayStr } from '../utils.js';

export function renderCanteenDashboard() {
    window.showView('canteen');
    const input = document.getElementById('can-emp-id');
    if (input) { input.value = ''; input.focus(); }

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'tokens');
    store.unsubscribeCanteen = onSnapshot(q, (snapshot) => {
        const container = document.getElementById('can-live-feed');
        container.innerHTML = '';
        const todayStr = getTodayStr();

        let tokens = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.issuedDate === todayStr && data.status === 'CONSUMED') {
                if (store.loggedInSysUser.role !== 'ADMIN' && data.consumedBySysUser !== store.loggedInSysUser.username) return;
                tokens.push({ id: doc.id, ...data });
            }
        });

        document.getElementById('can-today-count').textContent = tokens.length;
        tokens.sort((a, b) => (b.consumedAt?.seconds || 0) - (a.consumedAt?.seconds || 0));

        tokens.slice(0, 50).forEach(data => {
            const timeStr = data.consumedAt ? new Date(data.consumedAt.seconds*1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
            const empPhoto = store.EMPLOYEES[data.empId]?.photoData;
            const avatarHtml = empPhoto
                ? `<img src="${empPhoto}" class="h-11 w-11 rounded-full object-cover mr-4 border-2 border-emerald-400 shadow-sm">`
                : `<div class="h-11 w-11 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mr-4 shadow-sm border border-emerald-100 dark:border-emerald-800"><i class="fas fa-check"></i></div>`;

            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow';
            card.innerHTML = `
                <div class="flex items-center">${avatarHtml}<div><div class="font-bold text-slate-800 dark:text-white text-sm">${data.empName}</div><div class="text-xs text-slate-400 font-medium">${data.dept}</div></div></div>
                <div class="text-right"><div class="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-md">${timeStr}</div>
                ${store.loggedInSysUser.role === 'ADMIN' ? `<div class="text-[9px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-bold tracking-wider">TERM: ${data.consumedBySysUser || 'SYSTEM'}</div>` : `<div class="text-[9px] text-emerald-500 dark:text-emerald-400 mt-1 uppercase font-bold tracking-wider">Verified</div>`}</div>
            `;
            container.appendChild(card);
        });
    });
}

export async function processCanteenScan(empId) {
    const todayStr = getTodayStr();
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tokens'), where('issuedDate', '==', todayStr));
    try {
        const snapshot = await getDocs(q);
        const tokenDoc = snapshot.docs.find(docSnap => docSnap.data().empId === empId);

        if (!tokenDoc) return showScanResultModal('ACCESS DENIED', 'Not cleared at Security Terminal.', 'error');

        const data = tokenDoc.data();
        const emp = store.EMPLOYEES[empId];

        if (data.status === 'ISSUED') {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', tokenDoc.id), {
                status: 'CONSUMED',
                consumedAt: serverTimestamp(),
                consumedBy: store.currentUser.uid,
                consumedBySysUser: store.loggedInSysUser.username
            });
            showScanResultModal('MEAL APPROVED', `Serving: ${data.empName}`, 'success', emp?.photoData);
        } else if (data.status === 'CONSUMED') {
            showScanResultModal('ALREADY REDEEMED', `${data.empName} meal fulfilled.`, 'warning', emp?.photoData);
        }
    } catch (e) {
        console.error(e);
        showToast('System Error', 'error');
    }
}