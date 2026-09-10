// --- 1. LETTERBOXD (Title & Image) ---
const letterboxdRSS = 'https://letterboxd.com/Artuur_H/rss/';
const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(letterboxdRSS)}`;

fetch(rss2jsonUrl)
    .then(response => response.json())
    .then(data => {
        if (data.items && data.items.length > 0) {
            const latestFilm = data.items[0];

            const titleEl = document.getElementById('letterboxd-title');
            titleEl.textContent = latestFilm.title;
            titleEl.classList.remove('is-loading');

            const imgMatch = latestFilm.description.match(/src="([^"]+)"/);
            if (imgMatch && imgMatch[1]) {
                const imgElement = document.getElementById('letterboxd-img');
                imgElement.src = imgMatch[1];
                imgElement.classList.remove('is-loading');
                imgElement.style.display = 'block';
            } else {
                document.getElementById('letterboxd-img').classList.remove('is-loading');
            }
        } else {
            const titleEl = document.getElementById('letterboxd-title');
            titleEl.textContent = 'Nothing recent';
            titleEl.classList.remove('is-loading');
            document.getElementById('letterboxd-img').classList.remove('is-loading');
        }
    })
    .catch(error => {
        console.error('Error fetching Letterboxd:', error);
        const titleEl = document.getElementById('letterboxd-title');
        titleEl.textContent = 'Failed to load';
        titleEl.classList.remove('is-loading');
        document.getElementById('letterboxd-img').classList.remove('is-loading');
    });


// --- 2. LAST.FM (Top artist this week) ---
const lastfmUsername = 'Artuur_-';
const lastfmApiKey = 'a9b87172fb563505996c4ba2dcbcbe73';
const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${lastfmUsername}&period=7day&api_key=${lastfmApiKey}&format=json&limit=1`;

if (lastfmApiKey !== 'YOUR_API_KEY_HERE') {
    fetch(lastfmUrl)
        .then(response => response.json())
        .then(data => {
            const artistEl = document.getElementById('lastfm-artist');
            const imgElement = document.getElementById('lastfm-img');

            if (data.topalbums && data.topalbums.album.length > 0) {
                const topAlbum = data.topalbums.album[0];

                artistEl.textContent = `${topAlbum.name} by ${topAlbum.artist.name}`;
                artistEl.classList.remove('is-loading');

                const imgData = topAlbum.image.find(img => img.size === 'extralarge') || topAlbum.image[topAlbum.image.length - 1];

                if (imgData && imgData['#text']) {
                    imgElement.src = imgData['#text'];
                    imgElement.classList.remove('is-loading');
                    imgElement.style.display = 'block';
                } else {
                    imgElement.classList.remove('is-loading');
                }
            } else {
                artistEl.textContent = 'Nothing this week';
                artistEl.classList.remove('is-loading');
                imgElement.classList.remove('is-loading');
            }
        })
        .catch(error => {
            console.error('Error fetching Last.fm:', error);
            const artistEl = document.getElementById('lastfm-artist');
            artistEl.textContent = 'Failed to load';
            artistEl.classList.remove('is-loading');
            document.getElementById('lastfm-img').classList.remove('is-loading');
        });
} else {
    const artistEl = document.getElementById('lastfm-artist');
    artistEl.textContent = 'API key needed';
    artistEl.classList.remove('is-loading');
    document.getElementById('lastfm-img').classList.remove('is-loading');
}

// --- 3. STORYGRAPH (Fetched from local JSON built by GitHub Actions) ---
fetch('./storygraph.json')
    .then(response => {
        if (!response.ok) throw new Error('Data not found');
        return response.json();
    })
    .then(data => {
        const titleEl = document.getElementById('storygraph-title');
        titleEl.textContent = data.title;
        titleEl.classList.remove('is-loading');

        if (data.image) {
            const imgElement = document.getElementById('storygraph-img');
            imgElement.src = data.image;
            imgElement.classList.remove('is-loading');
            imgElement.style.display = 'block';
        } else {
            document.getElementById('storygraph-img').classList.remove('is-loading');
        }
    })
    .catch(error => {
        console.log('Storygraph scraper hasn\'t run yet:', error);
        const titleEl = document.getElementById('storygraph-title');
        titleEl.textContent = 'Waiting for GitHub Action...';
        titleEl.classList.remove('is-loading');
        document.getElementById('storygraph-img').classList.remove('is-loading');
    });


// --- THEME TOGGLE ---
const themeToggle = document.getElementById('theme-toggle');

const currentTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (currentTheme === 'dark' || (!currentTheme && prefersDark)) {
    document.body.classList.add('dark-theme');
    themeToggle.textContent = 'toggle light mode';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = 'toggle light mode';
    } else {
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = 'toggle dark mode';
    }
});

// --- PARALLAX ---
function initParallax() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const root = document.documentElement;

  // Scroll-based drift
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        root.style.setProperty('--scroll-y', window.scrollY);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Mouse-based drift
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hasFinePointer) return;

  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 40;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    root.style.setProperty('--mx', x.toFixed(2));
    root.style.setProperty('--my', y.toFixed(2));
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initParallax);

function initScrollReveal() {
  const selectors = '.card, .project-item, .link';
  const items = document.querySelectorAll(selectors);

  items.forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.setProperty('--reveal-i', i % 8);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initScrollReveal);