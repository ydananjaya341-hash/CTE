import { auth, db } from '../firebase.js';
import { store } from '../store.js';
import { appId, SYS_SESSION_KEY, MAX_IDLE_TIME } from '../config.js';
import { getTodayStr, showToast, incrementIdleTimer, getIdleTime, resetIdleTimer, showScanResultModal } from '../utils.js';
import { initTheme } from '../theme.js';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { autoExportDatabase } from './backup.js';

// Views object
const views = {
    login: document.getElementById('view-login'),
    menu: document.getElementById('view-menu'),
    security: document.getElementById('view-security'),
    canteen: document.getElementById('view-canteen'),
    staff: document.getElementById('view-staff'),
    report: document.getElementById('view-report'),
    planner: document.getElementById('view-planner'),
    users: document.getElementById('view-users'),
    loading: document.getElementById('view-loading')
};

export function showView(viewName) {
    Object.values(views).forEach(el => el && el.classList.add('hidden'));
    if (views[viewName]) views[viewName].classList.remove('hidden');

    const showBack = (viewName !== 'menu' && viewName !== 'loading' && viewName !== 'login');
    document.querySelectorAll('.section-back-btn').forEach(btn => {
        btn.classList.toggle('hidden', !showBack);
    });
    document.getElementById('nav-back-btn').classList.toggle('hidden', !showBack);
}

// Expose to window for HTML event handlers
window.showView = showView;

async function initAuth() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                await signInWithCustomToken(auth, __initial_auth_token);
            } catch {
                await signInAnonymously(auth);
            }
        } else {
            await signInAnonymously(auth);
        }
    } catch (err) {
        console.error("Authentication Error:", err);
        const loadingView = views.loading;
        if (loadingView) {
            loadingView.innerHTML = `<div class="bg-red-50 ...">Error: ${err.message}</div>`;
        }
    }
}

export function loadData() {
    if (!auth.currentUser) return;

    const qSys = query(collection(db, 'artifacts', appId, 'public', 'data', 'system_users'));
    onSnapshot(qSys, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                store.SYSTEM_USERS[change.doc.id] = change.doc.data();
            }
            if (change.type === "removed") {
                delete store.SYSTEM_USERS[change.doc.id];
            }
        });
        if (!store.dataLoaded) {
            store.dataLoaded = true;
            checkAuthRouting();
        }
        if (store.currentRole === 'USER_MANAGER' && !document.getElementById('user-tab-list').classList.contains('hidden')) {
            import('./users.js').then(m => m.renderSystemUsersList());
        }
    });

    const qEmp = query(collection(db, 'artifacts', appId, 'public', 'data', 'employees'));
    onSnapshot(qEmp, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                store.EMPLOYEES[change.doc.id] = change.doc.data();
            }
            if (change.type === "removed") {
                delete store.EMPLOYEES[change.doc.id];
            }
        });
        if (typeof window.renderStaffDirectory === 'function' && store.currentRole === 'STAFF_MANAGER' && !document.getElementById('staff-tab-directory').classList.contains('hidden')) {
            window.renderStaffDirectory();
        }
    });

    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'meal_prices'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().prices) {
            store.WEEKLY_PRICES = { ...store.WEEKLY_PRICES, ...docSnap.data().prices };
            if (store.currentRole === 'PLANNER') {
                import('./planner.js').then(m => m.updatePlannerInputs());
            }
        }
    });
}

function checkAuthRouting() {
    const sessionStr = localStorage.getItem(SYS_SESSION_KEY);
    if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const sysUser = store.SYSTEM_USERS[session.username];
        if (session.username === 'ADMIN' && session.date === getTodayStr()) {
            store.loggedInSysUser = { username: 'ADMIN', name: 'System Admin', role: 'ADMIN', status: 'ACTIVE' };
            proceedToMenu();
            return;
        }
        if (session.date === getTodayStr() && sysUser && sysUser.status === 'ACTIVE') {
            store.loggedInSysUser = sysUser;
            proceedToMenu();
            return;
        }
    }
    showView('login');
    document.getElementById('main-nav').classList.add('hidden');
}

function proceedToMenu() {
    showView('menu');
    document.getElementById('main-nav').classList.remove('hidden');
    document.getElementById('role-display').textContent = `${store.loggedInSysUser.name} (${store.loggedInSysUser.role})`;

    const role = store.loggedInSysUser.role;
    document.getElementById('tile-security').classList.toggle('hidden', role !== 'ADMIN' && role !== 'SECURITY');
    document.getElementById('tile-canteen').classList.toggle('hidden', role !== 'ADMIN' && role !== 'CANTEEN');
    document.getElementById('tile-report').classList.toggle('hidden', role !== 'ADMIN' && role !== 'REPORT_VIEWER');
    document.getElementById('tile-planner').classList.toggle('hidden', role !== 'ADMIN');
    document.getElementById('tile-staff').classList.toggle('hidden', role !== 'ADMIN');
    document.getElementById('tile-users').classList.toggle('hidden', role !== 'ADMIN');
    document.getElementById('admin-backup-btn').classList.toggle('hidden', role !== 'ADMIN');
}

export async function appLogin(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim().toUpperCase();
    const p = document.getElementById('login-pin').value.trim();

    if (u === 'ADMIN' && p === 'ADMIN123') {
        store.loggedInSysUser = { username: 'ADMIN', name: 'System Admin', role: 'ADMIN', status: 'ACTIVE' };
        localStorage.setItem(SYS_SESSION_KEY, JSON.stringify({ username: 'ADMIN', date: getTodayStr() }));
        document.getElementById('login-error').classList.add('hidden');
        await autoExportDatabase();
        proceedToMenu();
        return;
    }

    const user = store.SYSTEM_USERS[u];
    if (user && user.pin === p && user.status === 'ACTIVE') {
        store.loggedInSysUser = user;
        localStorage.setItem(SYS_SESSION_KEY, JSON.stringify({ username: u, date: getTodayStr() }));
        document.getElementById('login-error').classList.add('hidden');
        if (user.role === 'ADMIN') await autoExportDatabase();
        proceedToMenu();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

export function appLogout(auto = false) {
    localStorage.removeItem(SYS_SESSION_KEY);
    store.loggedInSysUser = null;
    store.currentRole = null;

    if (store.unsubscribeCanteen) store.unsubscribeCanteen();
    if (store.unsubscribeSecurity) store.unsubscribeSecurity();
    if (store.unsubscribeReport) store.unsubscribeReport();

    if (auto) {
        window.location.reload();
    } else {
        checkAuthRouting();
    }
}

export function goBack() {
    proceedToMenu();
}

export function switchRole(role) {
    store.currentRole = role;
    document.getElementById('main-nav').classList.remove('hidden');
    if (store.unsubscribeCanteen) store.unsubscribeCanteen();
    if (store.unsubscribeSecurity) store.unsubscribeSecurity();
    if (store.unsubscribeReport) store.unsubscribeReport();

    if (role === 'SECURITY') import('./attendance.js').then(m => m.renderAttendanceDashboard());
    else if (role === 'CANTEEN') import('./canteen.js').then(m => m.renderCanteenDashboard());
    else if (role === 'STAFF_MANAGER') import('./staff.js').then(m => m.renderStaffDashboard());
    else if (role === 'REPORT') import('./reports.js').then(m => m.renderReportDashboard());
    else if (role === 'USER_MANAGER') import('./users.js').then(m => m.renderUserDashboard());
    else if (role === 'PLANNER') {
        showView('planner');
        import('./planner.js').then(m => m.updatePlannerInputs());
    }
}

// Idle timer
export function startIdleTimer() {
    setInterval(() => {
        if (store.loggedInSysUser) {
            incrementIdleTimer();
            if (getIdleTime() >= MAX_IDLE_TIME) {
                appLogout(true);
            }
        }
    }, 1000);
}

// Firebase auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        store.currentUser = user;
        if (!store.dataLoaded) {
            loadData();
        }
    } else {
        showView('loading');
    }
});

initAuth();
initTheme();

// Attach global functions for HTML event handlers
window.appLogin = appLogin;
window.appLogout = appLogout;
window.goBack = goBack;
window.switchRole = switchRole;