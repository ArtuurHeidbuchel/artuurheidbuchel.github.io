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

/*
 * Scrolling photography strip.
 *
 * Markup: <div class="strip" data-strip><div class="strip-track"> <figure class="strip-item">…</figure> … </div></div>
 *
 * The items are moved into a group; the group is repeated until it is at least as wide as the screen,
 * then the whole group is duplicated once. CSS slides the track by exactly -50%, so the loop is seamless
 * at any screen width. Speed stays constant (px per second) no matter how many photos there are.
 */
(function () {
    'use strict';

    var SPEED = 45; // pixels per second; lower = slower

    document.querySelectorAll('[data-strip]').forEach(function (strip) {
        var track = strip.querySelector('.strip-track');
        if (!track) return;

        var originals = Array.prototype.slice.call(track.children);
        if (!originals.length) return;

        function build() {
            var group = document.createElement('div');
            group.className = 'strip-group';
            originals.forEach(function (el) { group.appendChild(el); });

            track.textContent = '';
            track.appendChild(group);

            // width of one set of photos
            var setWidth = group.getBoundingClientRect().width || 1;
            var reps = Math.max(1, Math.ceil(window.innerWidth / setWidth));

            // repeat the set until one group covers the screen (clones are hidden from assistive tech)
            for (var r = 1; r < reps; r++) {
                originals.forEach(function (el) {
                    var c = el.cloneNode(true);
                    c.setAttribute('aria-hidden', 'true');
                    group.appendChild(c);
                });
            }

            // the second group is what the track slides into
            var twin = group.cloneNode(true);
            twin.setAttribute('aria-hidden', 'true');
            track.appendChild(twin);

            var groupWidth = group.getBoundingClientRect().width;
            strip.style.setProperty('--speed', Math.round(groupWidth / SPEED) + 's');
            return reps;
        }

        var currentReps = build();

        // rebuild only when the screen grows enough to need more repeats
        var timer;
        window.addEventListener('resize', function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                var group = track.querySelector('.strip-group');
                if (!group) return;
                var setWidth = group.getBoundingClientRect().width / currentReps;
                var needed = Math.max(1, Math.ceil(window.innerWidth / setWidth));
                if (needed > currentReps) {
                    currentReps = build(); // build() re-collects the original nodes itself
                }
            }, 200);
        });
    });
})();