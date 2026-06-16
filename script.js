const toggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const styleToggleBtn = document.getElementById('style-toggle');
const styleIcon = document.getElementById('style-icon');
const body = document.body;

// Styles cycle: default → unchild → newjeans → default
const STYLES = ['default', 'unchild', 'newjeans'];
const STYLE_CLASSES = { unchild: 'unchild-mode', newjeans: 'newjeans-mode' };
const STYLE_ICONS = { default: 'UC', unchild: 'NJ', newjeans: '·· ' };

function clearStyleClasses() {
    body.classList.remove('unchild-mode', 'newjeans-mode');
}

function applyStyle(style) {
    clearStyleClasses();
    if (STYLE_CLASSES[style]) {
        body.classList.add(STYLE_CLASSES[style]);
    }
    styleIcon.textContent = STYLE_ICONS[style] || 'UC';
}

function updateThemeIcon() {
    themeIcon.textContent = body.classList.contains('light-mode') ? '☀' : '☾';
}

// ── Restore saved state ──
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    body.classList.add('light-mode');
    updateThemeIcon();
}

const savedStyle = localStorage.getItem('style') || 'default';
applyStyle(savedStyle);

// ── Dark/light toggle ──
toggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const theme = body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateThemeIcon();
});

// ── Style cycle toggle ──
styleToggleBtn.addEventListener('click', () => {
    const currentStyle = localStorage.getItem('style') || 'default';
    const currentIndex = STYLES.indexOf(currentStyle);
    const nextStyle = STYLES[(currentIndex + 1) % STYLES.length];

    applyStyle(nextStyle);
    localStorage.setItem('style', nextStyle);

    // Unchild and NewJeans both override light mode
    if (nextStyle !== 'default') {
        body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon();
    }
});