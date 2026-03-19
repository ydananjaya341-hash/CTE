import './firebase.js';          // just to initialise Firebase
import { auth } from './firebase.js';
import { startIdleTimer, resetIdleTimer } from './auth.js';
import { handleScannerInput, handleAutoScan, keepFocus, startWebcamScanner, stopWebcamScanner } from './scanner.js';
import { toggleTheme } from './theme.js';
import { showScanResultModal, showQrModal } from './utils.js'; // showQrModal must be implemented in utils or elsewhere
import { autoExportDatabase, exportDatabase, triggerRestore, importDatabase } from './modules/backup.js';

// Attach all global functions needed by inline HTML event handlers
window.handleScannerInput = handleScannerInput;
window.handleAutoScan = handleAutoScan;
window.keepFocus = keepFocus;
window.startWebcamScanner = startWebcamScanner;
window.stopWebcamScanner = stopWebcamScanner;
window.toggleTheme = toggleTheme;
window.showScanResultModal = showScanResultModal;
window.showQrModal = showQrModal;      // you need to implement showQrModal (original code had it)
window.autoExportDatabase = autoExportDatabase;
window.exportDatabase = exportDatabase;
window.triggerRestore = triggerRestore;
window.importDatabase = importDatabase;

// Idle timer reset listeners
document.onmousemove = resetIdleTimer;
document.onkeypress = resetIdleTimer;
document.onclick = resetIdleTimer;
document.ontouchstart = resetIdleTimer;

// Start idle timer after login (handled in auth)
startIdleTimer();

// Add any other initialisation