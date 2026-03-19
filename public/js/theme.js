export function initTheme() {
    const savedTheme = localStorage.getItem('canteen_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcon();
}

export function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    if (document.documentElement.classList.contains('dark')) {
        btn.innerHTML = '<i class="fas fa-sun text-yellow-400"></i>';
    } else {
        btn.innerHTML = '<i class="fas fa-moon text-slate-300"></i>';
    }
}

export function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('canteen_theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}