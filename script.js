// Variables to track game state
let coins = 0;
let baseCoinsPerClick = 1;
let coinsPerClick = baseCoinsPerClick;
let foodBuff = 0;
let currentSkin = 0;
let unlockedSkins = [true, false, false, false, false, false, false];
let activeHelpers = [false]; // Ensure this is initialized

// DOM Elements
const coinDisplay = document.querySelector('.coiny');
const clickerImage = document.getElementById('buszko');
const foodItems = document.querySelectorAll('.food-item');
const skinImages = document.querySelectorAll('.skins .skin-item img');
const resetButton = document.getElementById('resetButton');

const skinPrices = [0, 750, 20000, 100000, 690000, 100000000, 420000000000, 69000000000000000, 999999999999999999];
const skinMultipliers = [1, 2, 5, 10, 55, 100, 420, 696, 1000];
const foodPrices = [100, 2500, 100000, 4444444, 240000000, 5600000000];
const foodBuffs = [5, 25, 100, 444, 975, 1650];
const helperPrices = [125000];
const helperEarnings = [0.1]; // 10% of current Buszonki per click

// Update the coin display
function updateCoinDisplay() {
    coinDisplay.textContent = `Buszonki: ${Math.floor(coins)} (Buszonki na klikniecie: ${Math.floor(coinsPerClick)})`;
}

// Save progress with last online timestamp
function saveProgress() {
    const progress = {
        coins,
        baseCoinsPerClick,
        foodBuff,
        currentSkin,
        unlockedSkins,
        activeHelpers, // Save active helpers state
        lastOnline: Date.now(), // Save the current timestamp
    };
    localStorage.setItem('buszkoClickerProgress', JSON.stringify(progress));
}

// Load progress
function loadProgress() {
    const savedProgress = localStorage.getItem('buszkoClickerProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        coins = progress.coins || 0;
        baseCoinsPerClick = progress.baseCoinsPerClick || 1;
        foodBuff = progress.foodBuff || 0;
        currentSkin = progress.currentSkin || 0;
        unlockedSkins = progress.unlockedSkins || [true, false, false, false, false, false, false];
        activeHelpers = progress.activeHelpers || [false];

        const lastOnline = progress.lastOnline || Date.now();
        const timeElapsed = (Date.now() - lastOnline) / 1000; // Time elapsed in seconds

        // Calculate offline earnings for active helpers
        activeHelpers.forEach((isActive, index) => {
            if (isActive) {
                const earnings = coinsPerClick * helperEarnings[index] * timeElapsed;
                coins += earnings;
            }
        });

        applySkin(currentSkin);
        updateCoinDisplay();
        updateSkinUI();

        // Restart active helpers
        activeHelpers.forEach((isActive, index) => {
            if (isActive) {
                const helperDisplay = document.getElementById(`helperDisplay${index + 1}`);
                if (helperDisplay) {
                    helperDisplay.classList.remove('hidden');
                }
                startHelper(index); // Restart helper interval here
            }
        });
    }
}

// Initialize the game
loadProgress();

// Save progress periodically to track the last online time
setInterval(saveProgress, 10000); // Save every 10 seconds

// Reset all progress
function resetProgress() {
    if (confirm("Czy jesteś pewnien że chcesz zresetować cały postęp?")) {
        // Reset all game state
        coins = 0;
        baseCoinsPerClick = 1;
        coinsPerClick = baseCoinsPerClick;
        foodBuff = 0;
        currentSkin = 0;
        unlockedSkins = [true, false, false, false, false, false, false];
        activeHelpers = [false]; // Reset all helpers

        // Hide all helper displays
        document.querySelectorAll('.helper-item').forEach((helperItem, index) => {
            const helperDisplay = document.getElementById(`helperDisplay${index + 1}`);
            if (helperDisplay) {
                helperDisplay.classList.add('hidden');
            }
        });

        saveProgress();
        loadProgress();
        alert("Postęp zresetowany!");
    }
}

// Buszko click handler
function clickBuszko() {
    coins += coinsPerClick;
    updateCoinDisplay();
    saveProgress();
}

// Apply a skin
function applySkin(skinIndex) {
    if (unlockedSkins[skinIndex]) {
        currentSkin = skinIndex;
        clickerImage.src = skinImages[skinIndex].src;
        calculateCoinsPerClick();
        updateSkinUI();
        saveProgress();
    } else {
        alert("Jeszcze nie odblokowałeś tego skina :/");
    }
}

// Calculate coins per click
function calculateCoinsPerClick() {
    const skinMultiplier = skinMultipliers[currentSkin];
    coinsPerClick = (baseCoinsPerClick + foodBuff) * skinMultiplier;
}

// Update skin UI
function updateSkinUI() {
    skinImages.forEach((img, index) => {
        img.classList.toggle('unlocked', unlockedSkins[index]);
        img.style.opacity = unlockedSkins[index] ? '1' : '0.5';
        img.style.cursor = unlockedSkins[index] ? 'pointer' : 'not-allowed';
    });
}

// Handle skin click
skinImages.forEach((img, index) => {
    img.addEventListener('click', () => {
        if (unlockedSkins[index]) {
            applySkin(index);
        } else if (coins >= skinPrices[index]) {
            coins -= skinPrices[index];
            unlockedSkins[index] = true;
            applySkin(index);
            alert(`Odblokowałeś skina :D`);
            updateCoinDisplay();
            saveProgress();
        } else {
            alert(`Nie masz wystarczająco Buszonków żeby to kupić :(`);
        }
    });
});

// Handle food purchases and quantity logic
foodItems.forEach((foodItem, index) => {
    const buyButton = document.getElementById(`buy-food${index + 1}`);
    const quantityInput = document.getElementById(`food${index + 1}-quantity`);
    const maxQuantityDisplay = document.getElementById(`food${index + 1}-max`);

    // Function to update the maximum quantity of food that can be bought
    function updateMaxQuantity() {
        const maxQuantity = Math.floor(coins / foodPrices[index]); // Calculate the maximum number of items
        maxQuantityDisplay.textContent = `Max: ${maxQuantity}`; // Update the max quantity display
        quantityInput.setAttribute("max", maxQuantity); // Set the max value in the input field
    }

    // Update max quantity when the page loads and when coins change
    updateMaxQuantity();
    
    // Recalculate max quantity whenever the player has enough coins
    buyButton.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value); // Get the quantity from the input field
        const totalCost = foodPrices[index] * quantity; // Calculate the total cost

        if (quantity <= 0) {
            alert("Wpisz dodatnią liczbę!");
            return;
        }

        if (coins >= totalCost) {
            coins -= totalCost; // Deduct the coins for the total cost
            foodBuff += foodBuffs[index] * quantity; // Apply the food buff multiplied by the quantity
            calculateCoinsPerClick(); // Recalculate the coins per click
            alert(`Nakarmiłeś Buszona! Dostajesz więcej Buszonków: ${foodBuffs[index] * quantity}.`);
            updateCoinDisplay();
            saveProgress();
            updateMaxQuantity(); // Update the max quantity after purchase
        } else {
            alert(`Nie masz wystarczająco Buszonków, żeby to kupić!`);
        }
    });

    // Recalculate max quantity when coins change (if needed)
    setInterval(updateMaxQuantity, 1000); // Update every second (or whenever you need)
});

// Event listener for Buszko click
clickerImage.addEventListener('click', clickBuszko);

// Event listener for Reset Button
resetButton.addEventListener('click', resetProgress);

// Start a helper's autoclick
function startHelper(index) {
    setInterval(() => {
        if (activeHelpers[index]) {
            const earnings = coinsPerClick * helperEarnings[index];
            coins += earnings;
            updateCoinDisplay();
            saveProgress(); // Save progress regularly
        }
    }, 1000); // Autoclick every second
}

// Purchase a helper
function purchaseHelper(index) {
    if (coins >= helperPrices[index] && !activeHelpers[index]) {
        coins -= helperPrices[index];
        activeHelpers[index] = true;

        const helperDisplay = document.getElementById(`helperDisplay${index + 1}`);
        if (helperDisplay) {
            helperDisplay.classList.remove('hidden');
        }

        startHelper(index);
        alert("Pomocnik kupiony!");
        updateCoinDisplay();
        saveProgress(); // Save state after purchase
    } else if (activeHelpers[index]) {
        alert("Już masz tego pomocnika!");
    } else {
        alert("Nie masz wystarczająco Buszonków na tego pomocnika!");
    }
}

// Show helper displays only if they exist
activeHelpers.forEach((isActive, index) => {
    const helperDisplay = document.getElementById(`helperDisplay${index + 1}`);
    if (helperDisplay && isActive) {
        helperDisplay.classList.remove('hidden');
    }
});

// Add event listeners for helpers
document.querySelectorAll('.helper-item').forEach((helperItem, index) => {
    helperItem.addEventListener('click', () => purchaseHelper(index));
});

// Song Data: Updated Prices and States
const songs = [
    { id: 'song1', cost: 0, src: 'bones.mp3', unlocked: true }, // Free song, already unlocked
    { id: 'song2', cost: 99999999999999999, src: 'enemy.mp3', unlocked: false },
];

// Track Currently Playing Audio and Its ID
let currentAudio = null;
let currentSongId = null;

// Function to Unlock Songs
function unlockSong(song) {
    if (coins >= song.cost && !song.unlocked) {
        coins -= song.cost;
        song.unlocked = true;

        const songImage = document.getElementById(song.id);
        songImage.classList.remove('locked');
        songImage.classList.add('unlocked');
        songImage.title = "Kliknij żeby odtworzyć";

        alert(`Unlocked "${song.id}"!`);
        updateCoinDisplay();
        saveProgress();
    } else if (song.unlocked) {
        alert("Już to odblokowałeś!");
    } else {
        alert("Nie masz wystarczająco Buszonków, żeby to kupić!");
    }
}

// Function to Play or Stop a Song
function toggleSongPlayback(song) {
    if (!song.unlocked) {
        alert("Musisz najpierw odblokować to");
        return;
    }

    if (currentAudio && currentSongId === song.id) {
        // Stop the current song
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        currentSongId = null;
        alert(`Zatrzymano "${song.id}".`);
    } else {
        // Stop any playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        // Play the selected song
        currentAudio = new Audio(song.src);
        currentAudio.loop = true;
        currentAudio.play();
        currentSongId = song.id;
        alert(`Odtwarzanie "${song.id}"!`);
    }
}

// Add Event Listeners for Song Images
songs.forEach(song => {
    const songImage = document.getElementById(song.id);

    // Handle Click
    songImage.addEventListener('click', () => {
        if (!song.unlocked) {
            unlockSong(song);
        } else {
            toggleSongPlayback(song);
        }
    });

    // Update Initial Locked State
    if (!song.unlocked) {
        songImage.classList.add('locked');
    } else {
        songImage.classList.add('unlocked');
    }
});

function register() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const nickname = document.getElementById('nickname').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            db.ref('users/' + user.uid).set({
                nickname: nickname,
                buszonki: 0
            });
            alert('Rejestracja zakończona!');
        })
        .catch(error => alert(error.message));
}

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            alert('Zalogowano pomyślnie!');
        })
        .catch(error => alert(error.message));
}

function saveScore(score) {
    const user = auth.currentUser;
    if (user) {
        db.ref('users/' + user.uid).update({ buszonki: score });
        alert('Wynik zapisany!');
    } else {
        alert('Zaloguj się, aby zapisać wynik!');
    }
}

function getLeaderboard() {
    db.ref('users').orderByChild('buszonki').limitToLast(10).once('value', snapshot => {
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            console.log(`${data.nickname}: ${data.buszonki}`);
        });
    });
}
