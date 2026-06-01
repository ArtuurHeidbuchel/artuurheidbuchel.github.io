document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. TABS MECHANISME (SLIDER) ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabSlider = document.querySelector('.tab-slider');

    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            // Verwijder active class van alle knoppen en voeg toe aan de geklikte knop
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Haal het tab-index nummer op (0, 1 of 2)
            const tabIndex = this.getAttribute('data-tab');

            // Verschuif de slider: 0 = 0%, 1 = -100%, 2 = -200%
            tabSlider.style.transform = `translateX(-${tabIndex * 100}%)`;
        });
    });


    // --- 2. CHART.JS INITIALISATIE ---
    const canvas = document.getElementById('youtubeChart');
    if (canvas) {
        Chart.defaults.color = '#7a6b8c'; 
        Chart.defaults.font.family = "'Quicksand', sans-serif";
        Chart.defaults.font.weight = '600';

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                datasets: [{
                    label: 'Views (mln)',
                    data: [5.2, 7.1, 6.8, 8.5, 12.1, 15.2, 11.8],
                    fill: true,
                    backgroundColor: 'rgba(255, 166, 201, 0.2)', 
                    borderColor: '#ffa6c9', 
                    borderWidth: 3,
                    tension: 0.4, 
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#ffa6c9',
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(122, 107, 140, 0.05)', drawBorder: false },
                        ticks: { callback: function(value) { return value + 'M'; }, padding: 10 }
                    },
                    x: { grid: { display: false }, ticks: { padding: 10 } }
                },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }
});