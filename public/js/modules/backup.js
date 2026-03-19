import { db } from '../firebase.js';
import { store } from '../store.js';
import { appId } from '../config.js';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { showToast, showScanResultModal, getTodayStr } from '../utils.js';

export async function autoExportDatabase() {
    try {
        const backup = {
            date: new Date().toISOString(),
            employees: store.EMPLOYEES,
            system_users: store.SYSTEM_USERS,
            prices: store.WEEKLY_PRICES,
            tokens: {}
        };

        const qTokens = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'tokens'));
        qTokens.forEach(doc => { backup.tokens[doc.id] = doc.data(); });

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "CanteenOS_AutoBackup_" + getTodayStr() + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast("System Auto-Backup Complete", "success");
    } catch (e) {
        console.error("Auto Backup Failed:", e);
    }
}

export async function exportDatabase() {
    if (!confirm("Download full system backup? This contains all sensitive data.")) return;
    await autoExportDatabase();
}

export function triggerRestore() {
    document.getElementById('restore-input').click();
}

export async function importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!confirm(`Restore database from ${data.date}? Current data may be overwritten.`)) return;

            showScanResultModal("RESTORING...", "Please wait while data uploads...", "info");

            if (data.employees) {
                for (const [id, val] of Object.entries(data.employees)) {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', id), val);
                }
            }
            if (data.system_users) {
                for (const [id, val] of Object.entries(data.system_users)) {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'system_users', id), val);
                }
            }
            if (data.tokens) {
                for (const [id, val] of Object.entries(data.tokens)) {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', id), val);
                }
            }

            showScanResultModal("RESTORE COMPLETE", "System updated.", "success");
            window.location.reload();
        } catch (err) {
            console.error(err);
            showToast("Restore Malformed/Failed", "error");
            document.getElementById('result-modal').classList.add('hidden');
        }
    };
    reader.readAsText(file);
}

// Attach global
window.autoExportDatabase = autoExportDatabase;
window.exportDatabase = exportDatabase;
window.triggerRestore = triggerRestore;
window.importDatabase = importDatabase;