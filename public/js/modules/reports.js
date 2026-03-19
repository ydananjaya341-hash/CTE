import { db } from '../firebase.js';
import { store } from '../store.js';
import { appId } from '../config.js';
import { collection, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { showToast, formatCurrency, getTodayStr } from '../utils.js';

export function renderReportDashboard() {
    window.showView('report');
    document.getElementById('rpt-start').value = getTodayStr();
    document.getElementById('rpt-end').value = getTodayStr();

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'tokens');
    store.unsubscribeReport = onSnapshot(q, (snapshot) => {
        const todayStr = getTodayStr();
        const currentMonthStr = todayStr.substring(0, 7);

        let tokens = [];
        snapshot.forEach(doc => tokens.push({ id: doc.id, ...doc.data() }));
        tokens.sort((a, b) => (b.issuedAt?.seconds || 0) - (a.issuedAt?.seconds || 0));

        let totalCostToday = 0, issuedToday = 0, consumedToday = 0;
        let totalCostMonth = 0, issuedMonth = 0, consumedMonth = 0;

        const dailyStats = {};
        const deptStats = {}, acctStats = {}, compStats = {}, siteStats = {};

        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            dailyStats[d.toISOString().split('T')[0]] = 0;
        }

        const tbody = document.getElementById('report-table-body');
        if (tbody) tbody.innerHTML = '';

        let tableCount = 0;

        tokens.forEach(data => {
            const cost = data.costs?.total || 0;

            if (data.issuedDate && data.issuedDate.startsWith(currentMonthStr)) {
                totalCostMonth += cost;
                issuedMonth++;
                if (data.status === 'CONSUMED') consumedMonth++;
            }

            if (data.issuedDate === todayStr) {
                totalCostToday += cost;
                issuedToday++;
                if (data.status === 'CONSUMED') consumedToday++;

                if (tbody && tableCount < 200) {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors animate-fade-in';
                    tr.innerHTML = `
                        <td class="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">${data.empName}</td>
                        <td class="px-6 py-4 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">${data.issuedBySysUser || 'SYS'}</td>
                        <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">${data.dept}</td>
                        <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">${data.site || '-'}</td>
                        <td class="px-6 py-4 text-sm"><span class="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold ${data.status === 'ISSUED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}">${data.status}</span></td>
                        <td class="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">${formatCurrency(cost)}</td>
                        <td class="px-6 py-4 text-sm text-center">
                            <button onclick="deleteToken('${data.id}')" class="text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                    tableCount++;
                }
            }

            if (dailyStats.hasOwnProperty(data.issuedDate)) dailyStats[data.issuedDate] += cost;

            const dept = data.dept || 'Unknown';
            const acct = data.account || 'Unknown';
            const comp = data.company || 'Unknown';
            const site = data.site || 'Unknown';

            deptStats[dept] = (deptStats[dept] || 0) + cost;
            acctStats[acct] = (acctStats[acct] || 0) + cost;
            compStats[comp] = (compStats[comp] || 0) + cost;
            siteStats[site] = (siteStats[site] || 0) + cost;
        });

        document.getElementById('rpt-total-spend').textContent = formatCurrency(totalCostToday);
        document.getElementById('rpt-tokens-issued-today').textContent = issuedToday;
        document.getElementById('rpt-tokens-consumed-today').textContent = consumedToday;

        document.getElementById('rpt-month-spend').textContent = formatCurrency(totalCostMonth);
        document.getElementById('rpt-month-issued').textContent = issuedMonth;
        document.getElementById('rpt-month-consumed').textContent = consumedMonth;

        renderDistributionChart('rpt-chart-dept', deptStats, true);
        renderDistributionChart('rpt-chart-acct', acctStats, true);
        renderDistributionChart('rpt-chart-comp', compStats, true);
        renderDistributionChart('rpt-chart-site', siteStats, true);

        const trendContainer = document.getElementById('rpt-chart-trend');
        trendContainer.innerHTML = '';
        const maxDaily = Math.max(...Object.values(dailyStats), 10);
        Object.keys(dailyStats).forEach(date => {
            const val = dailyStats[date];
            const hPercent = (val / maxDaily) * 100;
            trendContainer.innerHTML += `
                <div class="flex flex-col items-center flex-1">
                    <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg relative group h-32 flex items-end justify-center">
                        <div class="w-3/4 bg-blue-500 rounded-t-md transition-all duration-700 hover:bg-blue-400" style="height: ${Math.max(hPercent, 2)}%"></div>
                        <div class="absolute -top-10 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg pointer-events-none">${formatCurrency(val)}</div>
                    </div>
                    <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-wider">${new Date(date).toLocaleDateString('en-US', {weekday: 'short'})}</div>
                </div>
            `;
        });
    });
}

export async function deleteToken(id) {
    if (confirm('Delete this transaction record?')) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', id));
        showToast('Record Removed', 'success');
    }
}

function renderDistributionChart(containerId, stats, showAmount = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const total = Object.values(stats).reduce((a, b) => a + b, 0) || 1;
    const sortedKeys = Object.keys(stats).sort((a, b) => stats[b] - stats[a]).slice(0, 5);

    sortedKeys.forEach(key => {
        const val = stats[key];
        const percent = (val / total) * 100;
        const label = showAmount ? `${key} (${formatCurrency(val)})` : key;

        container.innerHTML += `
            <div class="mb-4">
                <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-bold text-slate-700 dark:text-slate-300 truncate w-2/3" title="${key}">${label}</span>
                    <span class="text-slate-500 dark:text-slate-400 font-medium">${Math.round(percent)}%</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    });
}

export function printReport() {
    const content = document.getElementById('report-preview-content').innerHTML;
    const overlay = document.getElementById('print-overlay');
    overlay.innerHTML = content;
    overlay.className = 'print-mode-report';
    window.print();
}

export async function generateReportPreview() {
    const startDate = document.getElementById('rpt-start').value;
    const endDate = document.getElementById('rpt-end').value;
    const filterType = document.getElementById('rpt-filter-type').value;

    if (!startDate || !endDate) return showToast('Select date range', 'error');

    const modal = document.getElementById('report-preview-modal');
    const content = document.getElementById('report-preview-content');
    modal.classList.remove('hidden');
    content.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i><p class="mt-4 font-bold text-slate-500">Generating Crystal Report...</p></div>';

    try {
        const q = collection(db, 'artifacts', appId, 'public', 'data', 'tokens');
        const snapshot = await getDocs(q);
        let rows = "";
        let count = 0;
        let totalCost = 0;

        const processed = [];
        snapshot.forEach(doc => processed.push(doc.data()));
        processed.sort((a, b) => (a.issuedDate + a.issuedAt?.seconds) > (b.issuedDate + b.issuedAt?.seconds) ? 1 : -1);

        processed.forEach(t => {
            if (t.issuedDate < startDate || t.issuedDate > endDate) return;
            if (filterType === 'DEPT' && !t.dept) return;

            const timeStr = t.issuedAt ? new Date(t.issuedAt.seconds * 1000).toLocaleTimeString() : '';

            let groupVal = '';
            if (filterType === 'DEPT') groupVal = t.dept;
            else if (filterType === 'ACCT') groupVal = t.account;
            else if (filterType === 'COMP') groupVal = t.company;
            else if (filterType === 'SITE') groupVal = t.site;

            rows += `
                <tr>
                    <td>${t.issuedDate} ${timeStr}</td>
                    <td>${t.empName}</td>
                    <td>${t.empId}</td>
                    <td>${t.dept}</td>
                    <td>${t.site || '-'}</td>
                    <td>${t.status}</td>
                    ${filterType !== 'ALL' ? `<td class="font-bold text-blue-600">${groupVal || '-'}</td>` : ''}
                    <td style="text-align:right">${formatCurrency(t.costs.total)}</td>
                </tr>
            `;
            totalCost += t.costs.total;
            count++;
        });

        if (count === 0) {
            content.innerHTML = '<div class="text-center py-10 text-slate-500 font-bold">No records found for the selected criteria.</div>';
            return;
        }

        content.innerHTML = `
            <div class="print-mode-report">
                <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div><h1 style="font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase;">CANTEEN AUDIT REPORT</h1><div style="font-size: 14px; margin-top: 5px;">Filter: ${filterType} | Period: ${startDate} to ${endDate}</div></div>
                    <div style="text-align: right; font-size: 12px;"><div>Generated: ${new Date().toLocaleString()}</div><div>User: ${store.loggedInSysUser.name}</div></div>
                </div>
                <table class="report-table">
                    <thead><tr><th>Date/Time</th><th>Employee</th><th>ID</th><th>Department</th><th>Site</th><th>Status</th>${filterType !== 'ALL' ? `<th>${filterType}</th>` : ''}<th style="text-align:right">Cost</th></tr></thead>
                    <tbody>${rows}</tbody>
                    <tfoot><tr style="background-color: #f3f4f6; font-weight: bold;"><td colspan="${filterType !== 'ALL' ? 7 : 6}" style="text-align:right; padding: 10px;">TOTAL EXPENDITURE:</td><td style="text-align:right; padding: 10px;">${formatCurrency(totalCost)}</td></tr></tfoot>
                </table>
                <div style="margin-top: 40px; font-size: 12px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">*** CONFIDENTIAL SYSTEM REPORT ***</div>
            </div>
        `;
    } catch (e) {
        console.error(e);
        content.innerHTML = '<div class="text-red-500 text-center py-10">Error generating report preview.</div>';
    }
}

export async function generateReport() {
    const startDate = document.getElementById('rpt-start').value;
    const endDate = document.getElementById('rpt-end').value;
    const filterType = document.getElementById('rpt-filter-type').value;

    if (!startDate || !endDate) return showToast('Select date range', 'error');

    const btn = document.getElementById('rpt-gen-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        const q = collection(db, 'artifacts', appId, 'public', 'data', 'tokens');
        const snapshot = await getDocs(q);

        let csvHeaders = "";
        let rowMapper = null;
        const getTime = (t) => t.issuedAt ? new Date(t.issuedAt.seconds * 1000).toLocaleTimeString() : '';

        if (filterType === 'ACCT') {
            csvHeaders = "Date,Time,Account,Status,Cost\r\n";
            rowMapper = (t) => [`"${t.issuedDate}"`, `"${getTime(t)}"`, `"${t.account || '-'}"`, `"${t.status}"`, t.costs.total];
        } else if (filterType === 'DEPT') {
            csvHeaders = "Date,Time,Department,Status,Cost\r\n";
            rowMapper = (t) => [`"${t.issuedDate}"`, `"${getTime(t)}"`, `"${t.dept}"`, `"${t.status}"`, t.costs.total];
        } else if (filterType === 'COMP') {
            csvHeaders = "Date,Time,Company,Status,Cost\r\n";
            rowMapper = (t) => [`"${t.issuedDate}"`, `"${getTime(t)}"`, `"${t.company || '-'}"`, `"${t.status}"`, t.costs.total];
        } else if (filterType === 'SITE') {
            csvHeaders = "Date,Time,Site,Status,Cost\r\n";
            rowMapper = (t) => [`"${t.issuedDate}"`, `"${getTime(t)}"`, `"${t.site || '-'}"`, `"${t.status}"`, t.costs.total];
        } else {
            csvHeaders = "Date,Time,Emp Name,ID,Site,Account,Department,Company,Status,Cost,Issued By,Consumed By\r\n";
            rowMapper = (t) => [
                `"${t.issuedDate}"`, `"${getTime(t)}"`, `"${t.empName}"`, `"${t.empId}"`,
                `"${t.site || '-'}"`, `"${t.account || '-'}"`, `"${t.dept}"`, `"${t.company || '-'}"`,
                `"${t.status}"`, t.costs.total, `"${t.issuedBySysUser || '-'}"`, `"${t.consumedBySysUser || '-'}"`
            ];
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeaders;
        let count = 0;

        snapshot.forEach(doc => {
            const t = doc.data();
            if (t.issuedDate < startDate || t.issuedDate > endDate) return;
            csvContent += rowMapper(t).join(",") + "\r\n";
            count++;
        });

        if (count === 0) showToast('No records found for period', 'error');
        else {
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Analytics_${filterType}_${startDate}_to_${endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast(`Data Exported (${count} records)`, 'success');
        }
    } catch (e) {
        console.error("CSV Error:", e);
        showToast('Export failed', 'error');
    } finally {
        btn.innerHTML = 'Download CSV Extract';
        btn.disabled = false;
    }
}

// Attach global
window.deleteToken = deleteToken;
window.printReport = printReport;
window.generateReportPreview = generateReportPreview;
window.generateReport = generateReport;
