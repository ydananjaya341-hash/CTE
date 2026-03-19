import { db } from '../firebase.js';
import { store } from '../store.js';
import { appId } from '../config.js';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '../utils.js';

export function switchStaffTab(tab) {
    document.querySelectorAll('.staff-tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`staff-tab-${tab}`).classList.remove('hidden');

    document.querySelectorAll('.staff-tab-btn').forEach(el => {
        el.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
        el.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'shadow-sm');
    });
    document.getElementById(`staff-btn-${tab}`).classList.add('bg-blue-600', 'text-white', 'shadow-md');
    document.getElementById(`staff-btn-${tab}`).classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'shadow-sm');

    if (tab === 'directory') renderStaffDirectory();
    if (tab === 'create' && !store.isEditing) resetStaffForm();
}

function resetStaffForm() {
    document.getElementById('create-staff-form').reset();
    const idField = document.getElementById('new-emp-id');
    idField.readOnly = false;
    idField.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'cursor-not-allowed');
    store.isEditing = false;
    store.currentPhotoBase64 = null;
    document.getElementById('emp-photo-preview').classList.add('hidden');
    document.getElementById('emp-photo-preview').src = "";
    document.getElementById('photo-upload-input').value = "";
}

export function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 250;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            store.currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
            const preview = document.getElementById('emp-photo-preview');
            preview.src = store.currentPhotoBase64;
            preview.classList.remove('hidden');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

export function renderStaffDirectory() {
    const container = document.getElementById('staff-directory-list');
    container.innerHTML = '';

    const searchInput = document.getElementById('staff-search-input');
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let employees = Object.values(store.EMPLOYEES);
    if (searchVal) {
        employees = employees.filter(emp => {
            const id = emp.id ? emp.id.toLowerCase() : '';
            const name = emp.name ? emp.name.toLowerCase() : '';
            const dept = emp.dept ? emp.dept.toLowerCase() : '';
            const site = emp.site ? emp.site.toLowerCase() : '';
            const account = emp.accountName ? emp.accountName.toLowerCase() : '';
            const company = emp.companyName ? emp.companyName.toLowerCase() : '';
            return id.includes(searchVal) || name.includes(searchVal) || dept.includes(searchVal) ||
                   site.includes(searchVal) || account.includes(searchVal) || company.includes(searchVal);
        });
    }

    if (employees.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500 dark:text-slate-400 font-medium">No personnel records found matching criteria.</td></tr>';
        return;
    }

    employees.slice(0, 100).forEach(emp => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 transition-colors';

        const photoHtml = emp.photoData
            ? `<img src="${emp.photoData}" class="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-600 inline-block mr-3 shadow-sm">`
            : `<div class="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center text-xs inline-flex mr-3 shadow-sm"><i class="fas fa-user"></i></div>`;

        const safeName = emp.name.replace(/'/g, "\\'");
        const safeAccount = (emp.accountName || '').replace(/'/g, "\\'");

        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white tracking-wide">${emp.id}</td>
            <td class="px-6 py-4 text-sm flex items-center font-medium text-slate-700 dark:text-slate-200">${photoHtml} ${emp.name}</td>
            <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">${emp.dept}</td>
            <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">${emp.site || '-'}</td>
            <td class="px-6 py-4 text-sm">
                <div class="flex space-x-2">
                    <button onclick="showQrModal('${emp.id}', '${safeName}', '${safeAccount}')" class="bg-slate-800 dark:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-500 hover:shadow-md transition" title="Print Security Badge"><i class="fas fa-id-badge"></i></button>
                    <button onclick="editStaff('${emp.id}')" class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteStaff('${emp.id}')" class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        container.appendChild(tr);
    });
}

export async function createStaffProfile() {
    const empId = document.getElementById('new-emp-id').value.trim().toUpperCase();
    if (!empId) return showToast('ID required', 'error');

    const staffData = {
        id: empId,
        name: document.getElementById('new-emp-name').value.trim(),
        dept: document.getElementById('new-dept-name').value.trim(),
        site: document.getElementById('new-site-name').value.trim(),
        accountName: document.getElementById('new-acct-name').value.trim(),
        companyName: document.getElementById('new-comp-name').value.trim(),
        updatedAt: serverTimestamp()
    };

    if (store.currentPhotoBase64) staffData.photoData = store.currentPhotoBase64;

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', empId), staffData, { merge: true });
    showToast(store.isEditing ? 'Profile Updated' : 'Profile Created', 'success');
    resetStaffForm();
    switchStaffTab('directory');
}

export function editStaff(id) {
    const emp = store.EMPLOYEES[id];
    if (!emp) return;
    document.getElementById('new-emp-id').value = emp.id;
    document.getElementById('new-emp-name').value = emp.name;
    document.getElementById('new-dept-name').value = emp.dept;
    document.getElementById('new-site-name').value = emp.site || '';
    document.getElementById('new-acct-name').value = emp.accountName || '';
    document.getElementById('new-comp-name').value = emp.companyName || '';

    const idField = document.getElementById('new-emp-id');
    idField.readOnly = true;
    idField.classList.add('bg-slate-100', 'dark:bg-slate-700', 'cursor-not-allowed');

    if (emp.photoData) {
        store.currentPhotoBase64 = emp.photoData;
        const preview = document.getElementById('emp-photo-preview');
        preview.src = store.currentPhotoBase64;
        preview.classList.remove('hidden');
    } else {
        store.currentPhotoBase64 = null;
        document.getElementById('emp-photo-preview').classList.add('hidden');
    }

    store.isEditing = true;
    switchStaffTab('create');
}

export async function deleteStaff(id) {
    if (confirm(`Permanently delete record for ${id}?`)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', id));
        showToast('Record Deleted', 'success');
    }
}

export function renderStaffDashboard() {
    window.showView('staff');
    switchStaffTab('directory');
}

// Attach to window for inline event handlers
window.switchStaffTab = switchStaffTab;
window.handlePhotoUpload = handlePhotoUpload;
window.renderStaffDirectory = renderStaffDirectory;
window.createStaffProfile = createStaffProfile;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;