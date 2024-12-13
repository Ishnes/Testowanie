// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, update, onValue, set } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
// Konfiguracja Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBMPmNPLGHrBBU3d2DNgq1rutE5R5fBAWc",
    authDomain: "buszkoclicker.firebaseapp.com",
    databaseURL: "https://buszkoclicker-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "buszkoclicker",
    storageBucket: "buszkoclicker.firebasestorage.app",
    messagingSenderId: "951563794729",
    appId: "1:951563794729:web:f02b247e6cc5c16cf41f38"
};
// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// Zmienna globalna reprezentująca liczbę "Buszonków"
// Variables to track game state
let coins = 0;
let baseCoinsPerClick = 1;
let coinsPerClick = baseCoinsPerClick;
let foodBuff = 0;
let currentSkin = 0;
let unlockedSkins = [true, false, false, false, false, false, false];
let activeHelpers = [false]; // Ensure this is initialized
let lastSavedScore = 0;
let currentAudio = null;
let currentSongId = null;
// DOM Elements
const coinDisplay = document.querySelector('.coiny');
const clickerImage = document.getElementById('buszko');
const foodItems = document.querySelectorAll('.food-item');
const skinImages = document.querySelectorAll('.skins .skin-item img');
const resetButton = document.getElementById('resetButton');
const skinPrices = [0, 7500, 200000, 72000000, 690000000, 2300000000, 420000000000, 69000000000000000, 999999999999999999, 99999999999999999999999999999999];
const skinMultipliers = [1, 2, 5, 10, 55, 100, 420, 696, 1000, 9999];
const foodPrices = [100, 2500, 100000, 4444444, 240000000, 5600000000];
const foodBuffs = [5, 25, 100, 444, 975, 1650];
const helperPrices = [125000, 500000];
const helperEarnings = [0.02, 0.05]; // 10% of current Buszonki per click
const nickInput = document.querySelector('#playerNick');
const songs = [
    { id: 'song1', cost: 0, src: 'bones.mp3', unlocked: true }, // Free song, already unlocked
    { id: 'song2', cost: 99999999999999999, src: 'enemy.mp3', unlocked: false },
];
// Upewnij się, że zapisujemy coins podczas zapisu stanu gry
// Globalna zmienna na przechowywanie stanu gry
let progress = {};
function saveProgress() {
    progress = {
        coins,
        baseCoinsPerClick,
        foodBuff,
        currentSkin,
        unlockedSkins,
        activeHelpers,
        lastOnline: Date.now(),
    };
    updateCoinsInFirebase();
    // Zapis do localStorage
	localStorage.setItem("buszkoClickerProgress", JSON.stringify(progress));
}
// Save progress periodically to track the last online time
setInterval(() => {
    saveProgress();
}, 10000); // Zapisuj co 10 sekund
// Load progress
function loadProgress() {
    const savedProgress = localStorage.getItem('buszkoClickerProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        coins = progress.coins || 0;
        baseCoinsPerClick = progress.baseCoinsPerClick || 1;
        coinsPerClick = baseCoinsPerClick;
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
        updateCoinsInFirebase();  // Synchronizuj dane z Firebase
        updateSkinUI();
        // Restart active helpers
	    activeHelpers.forEach((isActive, index) => {
            if (isActive) {
                const helperDisplay = document.getElementById(`helperDisplay${index + 1}`);
                if (helperDisplay) {      helperDisplay.classList.remove('hidden');
                }
                startHelper(index); // Restart helper interval here
            }
        });
    }
}
// Initialize the game
loadProgress();
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
// Funkcja do obsługi kliknięcia Buszko
function clickBuszko() {
    coins += coinsPerClick; // Zwiększanie liczby coins o wartość coinsPerClick
    updateCoinDisplay();  // Aktualizowanie wyświetlania liczby coins
    saveProgress();  // Zapisz postęp gry
	updateCoinsInFirebase();
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
    const skinMultiplier = skinMultipliers[currentSkin]; // Mnożnik skina
    coinsPerClick = (baseCoinsPerClick + foodBuff) * skinMultiplier;
}
// Update skin UI
function updateSkinUI() {
    skinImages.forEach((img, index) => {        img.classList.toggle('unlocked', unlockedSkins[index]);
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
// Function to Update the UI for Locked/Unlocked Songs
function updateSongUI(song) {
    const songImage = document.getElementById(song.id);
    if (song.unlocked) {
        songImage.classList.remove('locked');
        songImage.classList.add('unlocked');
        songImage.title = "Kliknij żeby odtworzyć";
    } else {
        songImage.classList.remove('unlocked');
        songImage.classList.add('locked');
        songImage.title = `Locked: ${song.cost} Buszonki`;
    }
}
// Function to Unlock Songs
function unlockSong(song) {
    if (coins >= song.cost && !song.unlocked) {
        coins -= song.cost;
        song.unlocked = true;
        updateSongUI(song);
        alert(`Odblokowałeś "${song.id}"!`);
        updateCoinDisplay();
        saveProgress();
    } else if (song.unlocked) {
        alert("Już odblokowałeś tę piosenkę!");
    } else {
        alert("Nie masz wystarczająco Buszonków, żeby odblokować!");
    }
}
// Function to Play or Stop a Song
function toggleSongPlayback(song) {
    if (!song.unlocked) {
        alert("Musisz najpierw odblokować to");
        return;
    }
    if (currentAudio && currentSongId === song.id) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        currentSongId = null;
        alert(`Zatrzymano "${song.id}".`);
    } else {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        currentAudio = new Audio(song.src);
        currentAudio.loop = true;
        currentAudio.play();
        currentSongId = song.id;
        alert(`Odtwarzanie "${song.id}"!`);
    }
// Event Listeners - For UI Interaction
songs.forEach(song => {
    const songImage = document.getElementById(song.id);
    // Update initial locked/unlocked state on page load
    updateSongUI(song);
    // Handle click events for unlocking or toggling playback
    songImage.addEventListener('click', () => {
        if (!song.unlocked) {
            unlockSong(song);
        } else {
            toggleSongPlayback(song);
        }
    });
});
// Sprawdzanie istnienia elementów przed przypisaniem zdarzenia
document.addEventListener("DOMContentLoaded", () => {
    const submitButton = document.getElementById("submitNick");
    const nickInput = document.getElementById("playerNick");
    // Ensure both elements exist before proceeding
    if (!submitButton || !nickInput) {
        console.error("Submit button or nick input is missing in the DOM.");
        return;
    }
    submitButton.addEventListener("click", () => {
        const nick = nickInput.value.trim();
        if (!nick) {
            alert("Proszę wprowadzić poprawny nick!");
            return;
        }
        saveScoreToFirebase(nick, coins);
    });
    // Other initialization logic requiring nickInput
    setInterval(() => {
        const nick = nickInput.value.trim();
        if (nick && coins !== lastSavedScore) {
            saveScoreToFirebase(nick, coins);
            lastSavedScore = coins;
        }
    }, 10000); 
});
// Wywołanie automatycznego zapisu przy każdej zmianie coins
function updateCoinDisplay() {
    // Aktualizacja wyświetlania liczby Buszonków
    const safeCoins = Number.isFinite(coins) ? Math.floor(coins) : 0;
    const safeCoinsPerClick = Number.isFinite(coinsPerClick) ? Math.floor(coinsPerClick) : 0;
    coinDisplay.textContent = `Buszonki: ${safeCoins} (Buszonki na kliknięcie: ${safeCoinsPerClick})`;
    // Pobierz nick gracza
    const nickInput = document.getElementById("playerNick");
    const nick = nickInput ? nickInput.value.trim() : "Unknown";
    // Zapis danych do Firebase
    saveNickAndCoinsToFirebase(nick);
    // Zapis danych do localStorage
    if (progress && typeof progress === 'object') {
        localStorage.setItem("buszkoClickerProgress", JSON.stringify(progress));
    } else {
        console.error('Niepoprawny obiekt progress:', progress);
    }
}
// Pobiera IP użytkownika (przykład za pomocą API ipify.org)
const auth = getAuth();
// Funkcja do zalogowania się przez Google i pobrania unikatowego ID użytkownika
async function getGoogleUserId() {
    const provider = new GoogleAuthProvider();
    try {
        // Logowanie użytkownika przez Google
        const result = await signInWithPopup(auth, provider);      
        // Pobranie unikatowego ID użytkownika
        const user = result.user;
        console.log("Zalogowano jako:", user.displayName, "UID:", user.uid);
        // Zwrócenie unikatowego ID użytkownika
        return user.uid;
    } catch (error) {
        console.error("Błąd logowania przez Google:", error);
        return null;
    }
}
document.getElementById('loginButton').addEventListener(getGoogleUserId);
// Funkcja do zapisywania postępu w Firebase i localStorage
// Automatyczne zapisywanie nicka i coins do Firebase
async function saveNickAndCoinsToFirebase(nick) {
    const userId = await getGoogleUserId(); // Pobranie unikatowego ID użytkownika Google
    if (!userId) {
        console.error("Nie udało się pobrać unikatowego ID użytkownika.");
        return;
    }

    const userRef = ref(db, `leaderboard/${userId}`);

    update(userRef, { nick, coins })
        .then(() => console.log("Nick i coins zapisano pomyślnie w Firebase."))
        .catch((error) => console.error("Błąd zapisu do Firebase:", error));
}
    // Automatyczny zapis wyniku co 10 sekund

    document.addEventListener('DOMContentLoaded', () => {
        const nickInput = document.querySelector('#playerNick');
    
        setInterval(() => {
            const nick = nickInput.value.trim();
    
            if (nick && coins !== lastSavedScore) {
                saveScoreToFirebase(nick, coins);
                lastSavedScore = coins;
            }
        }, 10000);
    });
    // Inicjalizacja tablicy wyników
    updateLeaderboard();
// Funkcja do zapisywania wyniku w Firebase
// Zapisuje nick i wynik (liczbę coins) w Firebase
async function saveScoreToFirebase(nick, coins) {
    const userId = await getGoogleUserId();
    if (!userId) {
        console.error("Nie udało się uzyskać adresu IP użytkownika.");
        return;
    }
    const sanitizedId = userId.replace(/\./g, '_'); 
	const userRef = ref(db, `leaderboard/${sanitizedId}`);
    update(userRef, { nick, coins })
        .then(() => console.log("Nick i wynik zapisano pomyślnie."))
        .catch((error) => {
            console.error("Błąd zapisu do Firebase:", error);
        });
}
async function updateCoinsInFirebase() {
    try {
        const userId = await getGoogleUserId();
        console.log("User Id:", userId);
        console.log("Coins:", coins);
        if (userId) {
            const sanitizedId = userId.replace(/\./g, '_');
			const userRef = ref(db, `leaderboard/${sanitizedId}`);
            await update(userRef, { coins });
            console.log("Coins zaktualizowane w Firebase");
        } else {
            console.error("Nie udało się uzyskać adresu Id użytkownika");
        }
    } catch (error) {
        console.error("Błąd aktualizacji coins w Firebase:", error);
    }
}
// Funkcja do aktualizacji tablicy wyników
function updateLeaderboard() {
    const leaderboardRef = ref(db, "leaderboard");
    onValue(leaderboardRef, (snapshot) => {
        const leaderboardTable = document.querySelector("#leaderboardTable tbody");
        if (!leaderboardTable) return;
        leaderboardTable.innerHTML = ""; // Wyczyść tabelę przed odświeżeniem
        const data = snapshot.val();
        if (data) {
            const sortedData = Object.values(data).sort((a, b) => b.coins - a.coins);
            sortedData.forEach((entry) => {
                const row = document.createElement("tr");
                row.innerHTML = `<td>${entry.nick}</td><td>${entry.coins}</td>`;
                leaderboardTable.appendChild(row);
            });
        }
    });
}
