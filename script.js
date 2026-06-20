const toggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;

// style buttons
const btnDefault = document.getElementById('style-default');
const btnUnchild = document.getElementById('style-unchild');
const btnNewjeans = document.getElementById('style-newjeans');

const STYLE_CLASSES = { unchild: 'unchild-mode', newjeans: 'newjeans-mode' };

function clearStyleClasses() {
    body.classList.remove('unchild-mode', 'newjeans-mode');
}

// applied css styles op basis van de geselecteerde style
function applyStyle(style) {
    clearStyleClasses();
    if (STYLE_CLASSES[style]) {
        body.classList.add(STYLE_CLASSES[style]);
    }
}

function updateThemeIcon() {
    themeIcon.textContent = body.classList.contains('light-mode') ? '☀' : '☾';
}

// handled click events om van style te switchen, inclusief light mode dark mode
function switchStyle(nextStyle) {
    applyStyle(nextStyle);
    localStorage.setItem('style', nextStyle);

}

// saved style keuze in local storage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    body.classList.add('light-mode');
    updateThemeIcon();
}

const savedStyle = localStorage.getItem('style') || 'default';
applyStyle(savedStyle);

// dark mode light mode toggle
toggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const theme = body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateThemeIcon();
});

// button listeners
btnDefault.addEventListener('click', () => switchStyle('default'));
btnUnchild.addEventListener('click', () => switchStyle('unchild'));
btnNewjeans.addEventListener('click', () => switchStyle('newjeans'));