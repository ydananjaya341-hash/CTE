import { showScanResultModal } from './utils.js';

let scanDebounceTimer = null;
let html5QrcodeScanner = null;

async function executeScan(val, context) {
    if (!val) return;
    showScanResultModal('VERIFYING...', 'Processing...', 'info');
    if (context === 'SECURITY') {
        const { processAttendanceScan } = await import('./modules/attendance.js');
        processAttendanceScan(val);
    } else if (context === 'CANTEEN') {
        const { processCanteenScan } = await import('./modules/canteen.js');
        processCanteenScan(val);
    }
}

export function handleScannerInput(event, context) {
    if (event.key === 'Enter') {
        if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
        executeScan(event.target.value.trim().toUpperCase(), context);
        event.target.value = '';
        event.target.focus();
    }
}

export function handleAutoScan(event, context) {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
        const val = event.target.value.trim().toUpperCase();
        if (val.length >= 2) {
            executeScan(val, context);
            event.target.value = '';
            event.target.focus();
        }
    }, 10);
}

export function keepFocus(elementId) {
    setTimeout(() => {
        const el = document.getElementById(elementId);
        const isSec = !document.getElementById('view-security').classList.contains('hidden');
        const isCan = !document.getElementById('view-canteen').classList.contains('hidden');
        if ((elementId === 'sec-emp-id' && isSec) || (elementId === 'can-emp-id' && isCan)) {
            if (el && document.activeElement !== el) el.focus();
        }
    }, 100);
}

export function startWebcamScanner(context) {
    document.getElementById('webcam-modal').classList.remove('hidden');
    if (!html5QrcodeScanner) html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            stopWebcamScanner();
            executeScan(decodedText.trim().toUpperCase(), context);
        },
        () => {}
    ).catch(() => {
        showToast("Camera Error", "error");
        document.getElementById('webcam-modal').classList.add('hidden');
    });
}

export function stopWebcamScanner() {
    document.getElementById('webcam-modal').classList.add('hidden');
    if (html5QrcodeScanner) html5QrcodeScanner.stop().catch(() => {});
}