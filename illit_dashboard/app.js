document.addEventListener('DOMContentLoaded', function () {

    // ═══════════════════════════════════════════
    // 1. TABS — SLIDER MECHANISME
    // ═══════════════════════════════════════════
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabSlider  = document.querySelector('.tab-slider');

    tabButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const tabIndex = parseInt(this.getAttribute('data-tab'), 10);
            tabSlider.style.transform = `translateX(-${tabIndex * 100}%)`;
        });
    });

    // ═══════════════════════════════════════════
    // 2. DARK MODE TOGGLE
    // ═══════════════════════════════════════════
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon   = themeToggle ? themeToggle.querySelector('.theme-icon') : null;
    const htmlEl      = document.documentElement;

    // Herstel voorkeur uit localStorage
    const savedTheme = localStorage.getItem('illit-theme') || 'light';
    htmlEl.setAttribute('data-theme', savedTheme);
    if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const current = htmlEl.getAttribute('data-theme');
            const next    = current === 'dark' ? 'light' : 'dark';
            htmlEl.setAttribute('data-theme', next);
            localStorage.setItem('illit-theme', next);
            if (themeIcon) themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
            // Update chart kleuren voor het actieve thema
            updateChartColors();
        });
    }

    // ═══════════════════════════════════════════
    // 3. COUNTDOWN TIMER
    // Vervang targetDate door de echte release datum!
    // ═══════════════════════════════════════════
    const targetDate = new Date('2025-03-01T00:00:00+09:00'); // KST placeholder

    function updateCountdown() {
        const now  = new Date();
        const diff = targetDate - now;

        const cdDays  = document.getElementById('cd-days');
        const cdHours = document.getElementById('cd-hours');
        const cdMins  = document.getElementById('cd-mins');
        const cdSecs  = document.getElementById('cd-secs');

        if (!cdDays) return;

        if (diff <= 0) {
            cdDays.textContent  = '00';
            cdHours.textContent = '00';
            cdMins.textContent  = '00';
            cdSecs.textContent  = '00';
            return;
        }

        const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs  = Math.floor((diff % (1000 * 60)) / 1000);

        cdDays.textContent  = String(days).padStart(2, '0');
        cdHours.textContent = String(hours).padStart(2, '0');
        cdMins.textContent  = String(mins).padStart(2, '0');
        cdSecs.textContent  = String(secs).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Dagen sinds debuut (25 maart 2024)
    const debutDate  = new Date('2024-03-25T00:00:00+09:00');
    const daysSince  = Math.floor((new Date() - debutDate) / (1000 * 60 * 60 * 24));
    const daysEl     = document.getElementById('days-since-debut');
    if (daysEl) daysEl.textContent = daysSince;

    // ═══════════════════════════════════════════
    // 4. CHART.JS GLOBALE DEFAULTS
    // ═══════════════════════════════════════════
    function getTextColor() {
        return htmlEl.getAttribute('data-theme') === 'dark' ? '#a08cb8' : '#7a6b8c';
    }

    function applyChartDefaults() {
        Chart.defaults.color      = getTextColor();
        Chart.defaults.font.family = "'Quicksand', sans-serif";
        Chart.defaults.font.weight = '600';
    }

    applyChartDefaults();

    // Gedeelde opties helper voor assen
    function axisOpts() {
        return {
            grid:  { color: 'rgba(122, 107, 140, 0.07)', drawBorder: false },
            ticks: { color: getTextColor(), padding: 10 }
        };
    }

    // ═══════════════════════════════════════════
    // 5. YOUTUBE LIJNDIAGRAM
    // ═══════════════════════════════════════════
    let youtubeChart = null;
    const ytCanvas   = document.getElementById('youtubeChart');

    if (ytCanvas) {
        youtubeChart = new Chart(ytCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels:   ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                datasets: [{
                    label:                'Views (mln)',
                    data:                 [5.2, 7.1, 6.8, 8.5, 12.1, 15.2, 11.8],
                    fill:                 true,
                    backgroundColor:      'rgba(255, 166, 201, 0.18)',
                    borderColor:          '#ffa6c9',
                    borderWidth:          3,
                    tension:              0.4,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor:     '#ffa6c9',
                    pointRadius:          5,
                    pointHoverRadius:     8
                }]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.y}M views`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ...axisOpts(),
                        ticks: { callback: v => v + 'M', color: getTextColor(), padding: 10 }
                    },
                    x: {
                        grid:  { display: false },
                        ticks: { color: getTextColor(), padding: 10 }
                    }
                },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }

    // ═══════════════════════════════════════════
    // 6. SPOTIFY STAAFDIAGRAM
    // ═══════════════════════════════════════════
    let spotifyChart = null;
    const spCanvas   = document.getElementById('spotifyChart');

    if (spCanvas) {
        spotifyChart = new Chart(spCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels:   ['Magnetic', 'Lucky Girl', 'Tick-Tack', 'My World', 'Cherish'],
                datasets: [{
                    label:           'Streams (mln)',
                    data:             [92, 28, 18.5, 14.2, 11.8],
                    backgroundColor: [
                        'rgba(255, 166, 201, 0.75)',
                        'rgba(161, 196, 253, 0.75)',
                        'rgba(181, 234, 215, 0.75)',
                        'rgba(255, 214, 231, 0.75)',
                        'rgba(201, 177, 245, 0.75)'
                    ],
                    borderColor: [
                        '#ffa6c9', '#a1c4fd', '#b5ead7', '#ffd6e7', '#c9b1f5'
                    ],
                    borderWidth:  2,
                    borderRadius: 10,
                    borderSkipped: false
                }]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.y}M streams`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ...axisOpts(),
                        ticks: { callback: v => v + 'M', color: getTextColor(), padding: 10 }
                    },
                    x: {
                        grid:  { display: false },
                        ticks: { color: getTextColor(), padding: 10 }
                    }
                }
            }
        });
    }

    // ═══════════════════════════════════════════
    // 7. OVERALL DONUT DIAGRAM
    // ═══════════════════════════════════════════
    let overallChart = null;
    const ovCanvas   = document.getElementById('overallChart');

    if (ovCanvas) {
        overallChart = new Chart(ovCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels:   ['YouTube', 'Spotify', 'Overig'],
                datasets: [{
                    data:             [185.4, 74.6, 14.6],
                    backgroundColor:  ['rgba(255,166,201,0.8)', 'rgba(161,196,253,0.8)', 'rgba(181,234,215,0.8)'],
                    borderColor:      ['#ffa6c9', '#a1c4fd', '#b5ead7'],
                    borderWidth:      2,
                    hoverOffset:      8
                }]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                cutout:              '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed}M · ${((ctx.parsed / 274.6) * 100).toFixed(1)}%`
                        }
                    }
                }
            }
        });
    }

    // ═══════════════════════════════════════════
    // 8. MEMBERS STAAFDIAGRAM
    // ═══════════════════════════════════════════
    let membersChart = null;
    const mbCanvas   = document.getElementById('membersChart');

    if (mbCanvas) {
        membersChart = new Chart(mbCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels:   ['Yunah', 'Minju', 'Moka', 'Wonhee', 'Iroha'],
                datasets: [{
                    label:           'Fancam Views (mln)',
                    data:             [48.2, 39.7, 31.4, 44.1, 29.8],
                    backgroundColor: [
                        'rgba(255,166,201,0.75)',
                        'rgba(161,196,253,0.75)',
                        'rgba(181,234,215,0.75)',
                        'rgba(255,236,210,0.85)',
                        'rgba(224,195,252,0.75)'
                    ],
                    borderColor:     ['#ffa6c9','#a1c4fd','#b5ead7','#fcb69f','#c9b1f5'],
                    borderWidth:     2,
                    borderRadius:    10,
                    borderSkipped:   false
                }]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.y}M fancam views`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 55,
                        ...axisOpts(),
                        ticks: { callback: v => v + 'M', color: getTextColor(), padding: 10 }
                    },
                    x: {
                        grid:  { display: false },
                        ticks: { color: getTextColor(), padding: 10 }
                    }
                }
            }
        });
    }

    // ═══════════════════════════════════════════
    // 9. DARK MODE → CHART KLEUREN UPDATEN
    // ═══════════════════════════════════════════
    function updateChartColors() {
        const color = getTextColor();
        [youtubeChart, spotifyChart, overallChart, membersChart].forEach(chart => {
            if (!chart) return;
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.ticks) scale.ticks.color = color;
                });
            }
            chart.update();
        });
    }

});