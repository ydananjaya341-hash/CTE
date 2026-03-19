import { db } from '../firebase.js';
import { store } from '../store.js';
import { appId } from '../config.js';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '../utils.js';

export function switchUserTab(tab) {
    document.querySelectorAll('.user-tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`user-tab-${tab}`).classList.remove('hidden');

    document.querySelectorAll('.user-tab-btn').forEach(el => {
        el.classList.remove('bg-teal-600', 'text-white', 'shadow-md');
        el.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'shadow-sm');
    });
    document.getElementById(`user-btn-${tab}`).classList.add('bg-teal-600', 'text-white', 'shadow-md');
    document.getElementById(`user-btn-${tab}`).classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'shadow-sm');

    if (tab === 'create' && !store.isEditing) resetUserForm();
}

function resetUserForm() {
    document.getElementById('create-user-form').reset();
    const idField = document.getElementById('new-sys-username');
    idField.readOnly = false;
    idField.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'cursor-not-allowed');
    store.isEditing = false;
}

export async function createSystemUser() {
    const username = document.getElementById('new-sys-username').value.trim().toUpperCase();
    if (!username) return showToast('Terminal ID required', 'error');

    const userData = {
        username: username,
        name: document.getElementById('new-sys-name').value.trim(),
        role: document.getElementById('new-sys-role').value,
        pin: document.getElementById('new-sys-pin').value.trim(),
        status: document.getElementById('new-sys-status').value,
        updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'system_users', username), userData, { merge: true });
    showToast(store.isEditing ? 'Terminal Account Updated' : 'Terminal Account Created', 'success');
    resetUserForm();
    switchUserTab('list');
}

export function editSystemUser(username, name, role, pin, status) {
    document.getElementById('new-sys-username').value = username;
    document.getElementById('new-sys-name').value = name;
    document.getElementById('new-sys-role').value = role;
    document.getElementById('new-sys-pin').value = pin;
    document.getElementById('new-sys-status').value = status;

    const idField = document.getElementById('new-sys-username');
    idField.readOnly = true;
    idField.classList.add('bg-slate-100', 'dark:bg-slate-700', 'cursor-not-allowed');

    store.isEditing = true;
    switchUserTab('create');
}

export async function deleteSystemUser(username) {
    if (confirm(`Revoke access for Terminal ID ${username}?`)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'system_users', username));
        showToast('Access Revoked', 'success');
    }
}

export function renderSystemUsersList() {
    const container = document.getElementById('system-users-list');
    container.innerHTML = '';

    const users = Object.values(store.SYSTEM_USERS);
    if (users.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500 dark:text-slate-400 font-medium">No terminal accounts found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white font-mono tracking-wide">${user.username}</td>
            <td class="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">${user.name}</td>
            <td class="px-6 py-4 text-sm"><span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">${user.role}</span></td>
            <td class="px-6 py-4 text-sm">
                <span class="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'}">${user.status || 'ACTIVE'}</span>
            </td>
            <td class="px-6 py-4 text-sm">
                <div class="flex space-x-2">
                    <button onclick="editSystemUser('${user.username}', '${user.name}', '${user.role}', '${user.pin || ''}', '${user.status || 'ACTIVE'}')" class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteSystemUser('${user.username}')" class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        container.appendChild(tr);
    });
}

export function renderUserDashboard() {
    window.showView('users');
    switchUserTab('list');
    renderSystemUsersList();
}

// Attach global
window.switchUserTab = switchUserTab;
window.createSystemUser = createSystemUser;
window.editSystemUser = editSystemUser;
window.deleteSystemUser = deleteSystemUser;