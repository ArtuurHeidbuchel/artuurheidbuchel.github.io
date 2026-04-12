const toggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;

function updateIcon() {
    if (body.classList.contains('light-mode')) {
        themeIcon.textContent = '☀'; // Sun for light mode
    } else {
        themeIcon.textContent = '☾'; // Moon for dark mode
    }
}

const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
    body.classList.add('light-mode');
    updateIcon();
}

toggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    
    let theme = 'dark';
    if (body.classList.contains('light-mode')) {
        theme = 'light';
    }
    
    localStorage.setItem('theme', theme);
    updateIcon();
});