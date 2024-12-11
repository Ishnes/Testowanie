// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, update, onValue, set } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBMPmNPLGHrBBU3d2DNgq1rutE5R5fBAWc",
    authDomain: "buszkoclicker.firebaseapp.com",
    databaseURL: "https://buszkoclicker-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "buszkoclicker",
    storageBucket: "buszkoclicker.firebasestorage.app",
    messagingSenderId: "951563794729",
    appId: "1:951563794729:web:f02b247e6cc5c16cf41f38"
};

// Firebase Initialization
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Global Game Variables
let coins = 0;
let baseCoinsPerClick = 1;
let coinsPerClick = baseCoinsPerClick;
let foodBuff = 0;
let currentSkin = 0;
let unlockedSkins = [true, false, false, false, false, false, false];
let activeHelpers = [false];
let lastSavedScore = 0;

// DOM Elements
const coinDisplay = document.querySelector('.coiny');
const clickerImage = document.getElementById('buszko');
const foodItems = document.querySelectorAll('.food-item');
const skinImages = document.querySelectorAll('.skins .skin-item img');
const resetButton = document.getElementById('resetButton');

// Prices and Multipliers
const skinPrices = [0, 7500, 200000, 72000000, 690000000, 2300000000, 420000000000, 69000000000000000, 999999999999999999, 99999999999999999999999999999999];
const skinMultipliers = [1, 2, 5, 10, 55, 100, 420, 696, 1000, 9999];
const foodPrices = [100, 2500, 100000, 4444444, 240000000, 5600000000];
const foodBuffs = [5, 25, 100, 444, 975, 1650];
const helperPrices = [125000, 500000];
const helperEarnings = [0.02, 0.05]; // Earnings per helper

// Function to Save Score to Firebase
async function saveScoreToFirebase(nick, score) {
    const userIP = await getUserIP();
    if (!userIP) {
        console.error("Nie udało się uzyskać adresu IP użytkownika.");
        return;
    }

    const userRef = ref(db, `leaderboard/${userIP}`);
    update(userRef, { nick, score })
        .then(() => console.log("Nick i wynik zapisano pomyślnie."))
        .catch((error) => {
            console.error("Błąd zapisu do Firebase:", error);
        });
}

// Function to Update Leaderboard
function updateLeaderboard() {
    const leaderboardRef = ref(db, "leaderboard");
    onValue(leaderboardRef, (snapshot) => {
        const leaderboardTable = document.querySelector("#leaderboardTable tbody");
        if (!leaderboardTable) return;

        leaderboardTable.innerHTML = ""; // Clear table before refreshing

        const data = snapshot.val();
        if (data) {
            const sortedData = Object.values(data).sort((a, b) => b.score - a.score);
            sortedData.forEach((entry) => {
                const row = document.createElement("tr");
                row.innerHTML = `<td>${entry.nick}</td><td>${entry.score}</td>`;
                leaderboardTable.appendChild(row);
            });
        }
    });
}

// Function to Get User IP Address
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Nie udało się pobrać adresu IP:', error);
        return null;
    }
}

// Function to Update Coins in Firebase
async function updateCoinsInFirebase() {
    try {
        const userIP = await getUserIP();
        if (userIP) {
            const userRef = ref(db, `users/${userIP}/coins`);
            await update(userRef, { coins });
            console.log("Coins zaktualizowane w Firebase");
        } else {
            console.error("Nie udało się uzyskać adresu IP użytkownika");
        }
    } catch (error) {
        console.error("Błąd aktualizacji coins w Firebase:", error);
    }
}

// Event Listener for Saving Nickname and Coins
document.addEventListener("DOMContentLoaded", () => {
    const submitButton = document.getElementById("submitNick");
    const nickInput = document.getElementById("playerNick");

    if (!submitButton || !nickInput) {
        console.error("Brak wymaganych elementów w DOM.");
        return; // Exit if elements are not found
    }

    submitButton.addEventListener("click", () => {
        const nick = nickInput.value.trim();
        if (!nick) {
            alert("Podaj prawidłowy nick!");
            return;
        }
        saveScoreToFirebase(nick, coins);
    });

    // Automatic save every 10 seconds
    setInterval(() => {
        const nick = nickInput.value.trim();
        if (nick && coins !== lastSavedScore) {
            saveScoreToFirebase(nick, coins);
            lastSavedScore = coins;
        }
    }, 10000);

    // Initialize leaderboard
    updateLeaderboard();
});

// Function to Save Progress in Firebase and localStorage
async function saveNickAndCoinsToFirebase(nick) {
    const userIP = await getUserIP();
    if (userIP) {
        const userRef = ref(db, `leaderboard/${userIP}`);
        update(userRef, { nick, coins })
            .then(() => console.log("Nick i coins zapisano w Firebase"))
            .catch((error) => console.error("Błąd zapisu do Firebase:", error));
    }
}

// Function to Update Coin Display
function updateCoinDisplay() {
    coinDisplay.textContent = `Buszonki: ${Math.floor(coins)} (Buszonki na kliknięcie: ${Math.floor(coinsPerClick)})`;
    const nickInput = document.getElementById("playerNick");
    const nick = nickInput ? nickInput.value.trim() : "Unknown"; // Default to "Unknown" if not provided
    saveNickAndCoinsToFirebase(nick);
}

// Function to Save Game Progress
function saveProgress() {
    const progress = {
        coins,
        baseCoinsPerClick,
        foodBuff,
        currentSkin,
        unlockedSkins,
        activeHelpers,
        lastOnline: Date.now(),
    };

    // Save to Firebase and localStorage
    const nickInput = document.getElementById("playerNick");
    const nick = nickInput ? nickInput.value.trim() : "Unknown";
    saveNickAndCoinsToFirebase(nick);
    localStorage.setItem("buszkoClickerProgress", JSON.stringify(progress));
}

// Function to Load Progress
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
        updateCoinsInFirebase(); // Synchronize with Firebase
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

// Initialize the game and load progress
loadProgress();

// Save progress periodically to track the last online time
setInterval(saveProgress, 10000); // Save every 10 seconds

// Function to Reset Game Progress
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

// Function to Handle Clicks on Buszko
function clickBuszko() {
    coins += coinsPerClick; // Increase coins per click
    updateCoinDisplay();  // Update the display
    saveProgress();  // Save progress after click
}

// Apply selected skin
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

// Calculate coins per click based on skin multiplier
function calculateCoinsPerClick() {
    const skinMultiplier = skinMultipliers[currentSkin]; // Skin multiplier
    coinsPerClick = (baseCoinsPerClick + foodBuff) * skinMultiplier;
}

// Update skin UI
function updateSkin
