import { store } from './store.js';

export function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
}

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    const icon = document.getElementById('toast-icon');
    toast.className = `fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 z-[100] flex items-center space-x-3 font-medium ${
        type === 'error' ? 'bg-red-600 text-white shadow-red-500/30' :
        type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/30' :
        'bg-slate-800 dark:bg-slate-700 text-white shadow-slate-900/30'
    }`;
    icon.className = `fas text-xl ${
        type === 'error' ? 'fa-exclamation-circle' :
        type === 'success' ? 'fa-check-circle' :
        'fa-info-circle'
    }`;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

export function showScanResultModal(title, message, type, photoDataStr = null) {
    const modal = document.getElementById('result-modal');
    const iconEl = document.getElementById('res-icon');
    const bgEl = document.getElementById('res-bg');
    document.getElementById('res-title').textContent = title;
    document.getElementById('res-msg').textContent = message;

    const photoEl = document.getElementById('res-photo');
    if (photoDataStr) {
        photoEl.src = photoDataStr;
        photoEl.classList.remove('hidden');
        iconEl.classList.add('hidden');
    } else {
        photoEl.classList.add('hidden');
        iconEl.classList.remove('hidden');
        if (type === 'success') iconEl.className = "fas fa-check-circle text-6xl text-white mb-4 drop-shadow-md";
        else if (type === 'error') iconEl.className = "fas fa-times-circle text-6xl text-white mb-4 drop-shadow-md";
        else iconEl.className = "fas fa-exclamation-circle text-6xl text-white mb-4 drop-shadow-md animate-pulse";
    }

    modal.classList.remove('hidden');
    if (type === 'success') bgEl.className = "bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-t-2xl p-8 text-center relative overflow-hidden";
    else if (type === 'error') bgEl.className = "bg-gradient-to-br from-red-500 to-red-600 rounded-t-2xl p-8 text-center relative overflow-hidden";
    else bgEl.className = "bg-gradient-to-br from-blue-500 to-blue-600 rounded-t-2xl p-8 text-center relative overflow-hidden";

    if (title !== 'VERIFYING...') {
        setTimeout(() => modal.classList.add('hidden'), 800);
    }
}

// Idle timer helpers
export let idleTime = 0;
export function resetIdleTimer() { idleTime = 0; }
export function incrementIdleTimer() { idleTime++; }
export function getIdleTime() { return idleTime; }