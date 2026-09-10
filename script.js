// --- 1. LETTERBOXD (Title & Image) ---
const letterboxdRSS = 'https://letterboxd.com/Artuur_H/rss/';
const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(letterboxdRSS)}`;

fetch(rss2jsonUrl)
    .then(response => response.json())
    .then(data => {
        if (data.items && data.items.length > 0) {
            const latestFilm = data.items[0];
            
            document.getElementById('letterboxd-title').textContent = latestFilm.title;

            const imgMatch = latestFilm.description.match(/src="([^"]+)"/);
            if (imgMatch && imgMatch[1]) {
                const imgElement = document.getElementById('letterboxd-img');
                imgElement.src = imgMatch[1];
                imgElement.style.display = 'block';
            }
        }
    })
    .catch(error => {
        console.error('Error fetching Letterboxd:', error);
        document.getElementById('letterboxd-title').textContent = 'Failed to load';
    });


// --- 2. LAST.FM (Top artist this week) ---
const lastfmUsername = 'Artuur_-';
const lastfmApiKey = 'a9b87172fb563505996c4ba2dcbcbe73'; 
const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${lastfmUsername}&period=7day&api_key=${lastfmApiKey}&format=json&limit=1`;

if (lastfmApiKey !== 'YOUR_API_KEY_HERE') {
    fetch(lastfmUrl)
        .then(response => response.json())
        .then(data => {
            if (data.topalbums && data.topalbums.album.length > 0) {
                const topAlbum = data.topalbums.album[0];
                
                // Set text to "AlbumName by ArtistName"
                document.getElementById('lastfm-artist').textContent = `${topAlbum.name} by ${topAlbum.artist.name}`;
                
                // Last.fm returns an array of images. We want the 'extralarge' one for best quality.
                const imgData = topAlbum.image.find(img => img.size === 'extralarge') || topAlbum.image[topAlbum.image.length - 1];
                
                if (imgData && imgData['#text']) {
                    const imgElement = document.getElementById('lastfm-img');
                    imgElement.src = imgData['#text'];
                    imgElement.style.display = 'block'; // Unhide the image
                }
            } else {
                document.getElementById('lastfm-artist').textContent = 'Nothing this week';
            }
        })
        .catch(error => {
            console.error('Error fetching Last.fm:', error);
            document.getElementById('lastfm-artist').textContent = 'Failed to load';
        });
} else {
    document.getElementById('lastfm-artist').textContent = 'API key needed';
}

// --- 3. STORYGRAPH (Fetched from local JSON built by GitHub Actions) ---
fetch('./storygraph.json')
    .then(response => {
        if (!response.ok) throw new Error('Data not found');
        return response.json();
    })
    .then(data => {
        document.getElementById('storygraph-title').textContent = data.title;
        
        if (data.image) {
            const imgElement = document.getElementById('storygraph-img');
            imgElement.src = data.image;
            imgElement.style.display = 'block';
        }
    })
    .catch(error => {
        console.log('Storygraph scraper hasn\'t run yet:', error);
        document.getElementById('storygraph-title').textContent = 'Waiting for GitHub Action...';
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