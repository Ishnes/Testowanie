document.getElementById('foodTab').addEventListener('click', function() {
    showSection('foodSection');
});

document.getElementById('helpersTab').addEventListener('click', function() {
    showSection('helpersSection');
});

document.getElementById('skinsTab').addEventListener('click', function() {
    showSection('skinsSection');
});

document.getElementById('songsTab').addEventListener('click', function() {
    showSection('songsSection');
});

function showSection(sectionId) {
    // Ukryj wszystkie sekcje
    const sections = document.querySelectorAll('.tab-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Pokaż wybraną sekcję
    const section = document.getElementById(sectionId);
    section.classList.add('active');
}
