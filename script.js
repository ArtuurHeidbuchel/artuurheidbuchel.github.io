const toggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;

// ── Get the new style buttons ──
const btnDefault = document.getElementById('style-default');
const btnUnchild = document.getElementById('style-unchild');
const btnNewjeans = document.getElementById('style-newjeans');

const STYLE_CLASSES = { unchild: 'unchild-mode', newjeans: 'newjeans-mode' };

function clearStyleClasses() {
    body.classList.remove('unchild-mode', 'newjeans-mode');
}

// Applies the CSS classes based on the selected style
function applyStyle(style) {
    clearStyleClasses();
    if (STYLE_CLASSES[style]) {
        body.classList.add(STYLE_CLASSES[style]);
    }
}

function updateThemeIcon() {
    themeIcon.textContent = body.classList.contains('light-mode') ? '☀' : '☾';
}

// Handles the click event for styles, including saving and overriding light mode
function switchStyle(nextStyle) {
    applyStyle(nextStyle);
    localStorage.setItem('style', nextStyle);

    // Unchild and NewJeans both override light mode
    if (nextStyle !== 'default') {
        body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon();
    }
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

// ── Button Listeners ──
btnDefault.addEventListener('click', () => switchStyle('default'));
btnUnchild.addEventListener('click', () => switchStyle('unchild'));
btnNewjeans.addEventListener('click', () => switchStyle('newjeans'));