import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, update, onValue, set } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithRedirect } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBMPmNPLGHrBBU3d2DNgq1rutE5R5fBAWc",
    authDomain: "buszkoclicker.firebaseapp.com",
    databaseURL: "https://buszkoclicker-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "buszkoclicker",
    storageBucket: "buszkoclicker.firebasestorage.app",
    messagingSenderId: "951563794729",
    appId: "1:951563794729:web:f02b247e6cc5c16cf41f38"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

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
let progress = {};
let userId = null; // Globalna zmienna na ID użytkownika
let currentNick = ""; // Globalna zmienna na nick
// DOM Elements
const coinDisplay = document.querySelector('.coiny');
const clickerImage = document.getElementById('buszko');
const foodItems = document.querySelectorAll('.food-item');
const skinImages = document.querySelectorAll('.skins .skin-item img');
const resetButton = document.getElementById('resetButton');
const skinPrices = 
[
    0, 
    10000, 
    200000, 
    3000000, 
    40000000, 
    500000000, 
    60000000000, 
    700000000000, 
    80000000000000, 
    90000000000000000, 
    10000000000000000000, 
    11000000000000000000000,
    120000000000000000000000000,
    130000000000000000000000000000
];
const skinMultipliers = [1, 2, 4, 10, 20, 50, 100, 250, 500, 1000, 1200, 1400, 1600, 1800];
const foodPrices = [100, 2500, 10000, 300000, 2500000, 50000000];
const foodBuffs = [1, 5, 10, 25, 100, 250];
const helperPrices = [225000, 1000000, 500000000];
const helperEarnings = [0.01, 0.05, 0.10]; // 10% of current Buszonki per click
const nickInput = document.querySelector('#playerNick');
const songs = [
    { id: 'song1', cost: 0, src: 'bones.mp3', unlocked: true }, // Free song, already unlocked
    { id: 'song2', cost: 9999, src: 'enemy.mp3', unlocked: false },];

function formatCoins(value) {
    if (value < 100_000_000) return value.toString();

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let zeros = Math.floor(Math.log10(value)); // Liczba zer w liczbie
    let letterIndex = Math.max(0, zeros - 8); // Odliczamy od 100 milionów (8 zer)

    // Obsługa wieloliterowych oznaczeń
    let letter = '';
    while (letterIndex >= 0) {
        letter = alphabet[letterIndex % 26] + letter;
        letterIndex = Math.floor(letterIndex / 26) - 1; // Obsługa kolejnych "cykli"
    }

    // Obliczanie prefiksu (pierwsze 4 cyfry)
    const divisor = Math.pow(10, zeros - 3); // Dzielenie liczby tak, aby 4 cyfry zostały
    const prefix = Math.floor(value / divisor); // Prefiks jako liczba całkowita z 4 cyframi

    return `${prefix}${letter}`;
}
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

async function initializeAuth() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        userId = result.user.uid;
        console.log("Zalogowano jako:", result.user.displayName);
        localStorage.setItem("userId", userId); // Zapisz userId w localStorage
        loadProgressFromFirebase(); // Wczytaj postęp gry z Firebase
        updateLoginButton(); // Aktualizacja przycisku logowania
    } catch (error) {
        console.error("Błąd logowania:", error);
        if (error.code === "auth/popup-blocked") {
            alert("Twoja przeglądarka zablokowała wyskakujące okno. Upewnij się, że jest dozwolone.");
        }
    }
}

document.getElementById('loginButton').addEventListener("click", async () => {
    initializeAuth();
});

// Modyfikacja funkcji logoutUser
async function logoutUser() {
    try {
        await auth.signOut();
        userId = null;
        localStorage.removeItem("userId");
        updateLoginButton();
        showLogoutCountdown(); // Wywołanie funkcji odliczania
    } catch (error) {
        console.error("Błąd podczas wylogowania:", error);
    }
}

function updateLoginButton() {
    const loginButton = document.getElementById('loginButton');
    if (userId) {
        loginButton.textContent = "Wyloguj"; // Użytkownik jest zalogowany
        loginButton.removeEventListener("click", initializeAuth);
        loginButton.addEventListener("click", logoutUser);
    } else {
        loginButton.textContent = "Zaloguj"; // Użytkownik jest niezalogowany
        loginButton.removeEventListener("click", logoutUser);
        loginButton.addEventListener("click", initializeAuth);
    }
}

// Modyfikacja logiki przy ładowaniu strony
document.addEventListener("DOMContentLoaded", () => {
    const savedUserId = localStorage.getItem("userId");
    if (savedUserId) {
        userId = savedUserId;
        loadProgressFromFirebase(); // Wczytaj dane użytkownika z Firebase
    }
    updateLoginButton(); // Zaktualizuj stan przycisku
});

// Funkcja odliczająca czas i odświeżająca stronę
function showLogoutCountdown() {
    let countdown = 10;
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = '#1e1e1e';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    modal.style.zIndex = '1000';
    modal.style.textAlign = 'center';

    const message = document.createElement('p');
    message.textContent = 'Wylogowano pomyślnie! Strona odświeży się za 10 sekund.';
    const timer = document.createElement('p');
    timer.style.fontSize = '24px';
    timer.style.fontWeight = 'bold';
    timer.textContent = `Pozostało: ${countdown} sekund`;
    
    modal.appendChild(message);
    modal.appendChild(timer);
    document.body.appendChild(modal);

    const interval = setInterval(() => {
        countdown--;
        timer.textContent = `Pozostało: ${countdown} sekund`;
        if (countdown === 0) {
            clearInterval(interval);
        }
    }, 1000);

    setTimeout(() => {
        document.body.removeChild(modal);
        location.reload();
    }, 10000);
}

async function saveProgress() {
    if (!userId) {
        console.error("Użytkownik nie jest zalogowany. Nie można zapisać progresu.");
        return;
    }
    progress = {
        nick: currentNick, // Dodaj nick
        coins,
        baseCoinsPerClick,
        foodBuff,
        currentSkin,
        unlockedSkins,
        activeHelpers,
        foodPrices,
        lastOnline: Date.now(),
    };
    const sanitizedId = userId.replace(/\./g, '_');
    const userRef = ref(db, `leaderboard/${sanitizedId}`);
    try {
        await update(userRef, progress);
        console.log("Progres zapisany w Firebase");
    } catch (error) {
        console.error("Błąd podczas zapisu do Firebase:", error);
    }
}


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
    if (confirm("Czy jesteś pewien, że chcesz zresetować cały postęp?")) {
        coins = 0;
        baseCoinsPerClick = 1;
        foodBuff = 0;
        currentSkin = 0;
        unlockedSkins = [true, false, false, false, false, false, false];
        activeHelpers = [false];
        foodPrices = [100, 2500, 10000, 300000, 2500000, 50000000];
        saveProgress(); // Zapisz zresetowany progres
        loadProgress(); // Załaduj stan gry
        updateUI(); // Zaktualizuj UI
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
    const foodSpan = foodItem.querySelector('span'); // Element, w którym będzie wyświetlana cena

    buyButton.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value); // Get the quantity from the input field
        const totalCost = foodPrices[index] * quantity; // Calculate the total cost

        if (quantity <= 0 || isNaN(quantity)) {
            alert("Wpisz dodatnią liczbę!");
            return;
        }

        if (coins >= totalCost) {
            coins -= totalCost; // Deduct the coins for the total cost
            foodBuff += foodBuffs[index] * quantity; // Apply the food buff multiplied by the quantity
            foodPrices[index] = Math.floor(foodPrices[index] * 1.01); // Zwiększamy cenę jedzenia o 1% i zaokrąglamy

            // Zaktualizuj wyświetlaną cenę
            foodSpan.textContent = `${foodItem.querySelector('img').alt} [${formatCoins(Math.floor(foodPrices[index]))} Buszonki] Buszonki +${foodBuffs[index]}`;

            calculateCoinsPerClick(); // Recalculate the coins per click
            updateCoinDisplay();
            saveProgress(); // Zapisz zmienione dane (w tym ceny jedzenia) w Firebase
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
        startHelper(index); // Uruchomienie pomocnika
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

// Uniwersalna funkcja zapisu do Firebase
async function saveUserDataToFirebase(data) {
    if (!userId) {
        console.error("Użytkownik nie jest zalogowany. Nie można zapisać danych.");
        return;
    }

    try {
        const sanitizedId = userId.replace(/\./g, '_');
        const userRef = ref(db, `leaderboard/${sanitizedId}`);

        await update(userRef, {
            ...data,
            lastUpdated: Date.now(), // Zapis ostatniej aktualizacji
        });

        console.log("Dane zapisane w Firebase:", data);
    } catch (error) {
        console.error("Błąd zapisu danych do Firebase:", error);
    }
}


// Funkcja ładowania postępu z Firebase
async function loadProgressFromFirebase() {
    if (!userId) {
        console.error("Użytkownik nie jest zalogowany.");
        return;
    }

    try {
        const sanitizedId = userId.replace(/\./g, '_');
        const userRef = ref(db, `leaderboard/${sanitizedId}`);

        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                initializeGameProgress(data);
            } else {
                console.log("Brak zapisanych danych, inicjalizacja nowego progresu.");
                saveUserDataToFirebase(defaultProgress);
            }
        });
    } catch (error) {
        console.error("Błąd podczas wczytywania danych z Firebase:", error);
    }
}


// Inicjalizacja postępu gry
function initializeGameProgress(data) {
    coins = Math.floor(data.coins || 0); // Zaokrąglamy liczbę monet
    baseCoinsPerClick = Math.floor(data.baseCoinsPerClick || 1); // Zaokrąglamy liczbę monet na kliknięcie
    foodBuff = Math.floor(data.foodBuff || 0); // Zaokrąglamy buffy jedzenia
    currentSkin = data.currentSkin || 0;
    unlockedSkins = data.unlockedSkins || [true, false, false, false, false, false, false];
    activeHelpers = data.activeHelpers || [false];
    foodPrices = data.foodPrices || [100, 2500, 10000, 300000, 2500000, 50000000];

    updateUI();
}


// Aktualizacja UI
function updateUI() {
    // Zaktualizuj wyświetlanie monet i innych danych
    updateCoinDisplay();

    // Zaktualizuj ceny jedzenia
    foodItems.forEach((foodItem, index) => {
        const foodSpan = foodItem.querySelector('span');
        foodSpan.textContent = `${foodItem.querySelector('img').alt} [${formatCoins(foodPrices[index])} Buszonki] Buszonki +${foodBuffs[index]}`;
    });

    // Ukryj aktywnych pomocników
    document.querySelectorAll('.helper-item').forEach((helperItem, index) => {
        const helperDisplay = document.getElementById(`helperDisplay${index + 1}`);
        if (helperDisplay) {
            helperDisplay.classList.add('hidden');
        }
    });

    // Zaktualizuj wyświetlanie skórek
    updateSkinUI();
}



// Obsługa wyświetlania monet
function updateCoinDisplay() {
    const safeCoins = Number.isFinite(coins) ? Math.floor(coins) : 0; // Zapewnia, że monety są liczbą całkowitą
    const safeCoinsPerClick = Number.isFinite(coinsPerClick) ? Math.floor(coinsPerClick) : 0; // Zapewnia, że monety na kliknięcie są liczbą całkowitą

    const formattedCoins = formatCoins(safeCoins);
    const formattedCoinsPerClick = formatCoins(safeCoinsPerClick);

    coinDisplay.textContent = `Buszonki: ${formattedCoins} (Buszonki na kliknięcie: ${formattedCoinsPerClick})`;
}


// Inicjalizacja zdarzeń
document.addEventListener("DOMContentLoaded", async () => {
    const savedUserId = localStorage.getItem("userId");

    if (savedUserId) {
        userId = savedUserId;
        loadProgressFromFirebase();
    } else {
        await initializeAuth();
    }

    const submitButton = document.getElementById("submitNick");
    const nickInput = document.getElementById("playerNick");

    if (submitButton && nickInput) {
        submitButton.addEventListener("click", () => {
            const nick = nickInput.value.trim();
            if (!nick) {
                alert("Proszę wprowadzić poprawny nick!");
                return;
            }
            currentNick = nick;
            saveUserDataToFirebase({ nick, coins });
        });
    }

    // Automatyczny zapis co 30 sekund
    setInterval(() => {
        if (currentNick && coins !== lastSavedScore) {
            saveUserDataToFirebase({ nick: currentNick, coins });
            lastSavedScore = coins;
        }
    }, 30000); // Automatyczny zapis co 30 sekund
    
});

// Aktualizacja tablicy wyników
function updateLeaderboard() {
    const leaderboardRef = ref(db, "leaderboard");
    onValue(leaderboardRef, (snapshot) => {
        const leaderboardTable = document.querySelector("#leaderboardTable tbody");
        if (!leaderboardTable) return;

        leaderboardTable.innerHTML = "";
        const data = snapshot.val();
        if (data) {
            const sortedData = Object.values(data).sort((a, b) => b.coins - a.coins);
            sortedData.forEach((entry) => {
                const formattedCoins = formatCoins(entry.coins);
                const row = document.createElement("tr");
                row.innerHTML = `<td>${entry.nick}</td><td>${formattedCoins}</td>`;
                leaderboardTable.appendChild(row);
            });
        }
    });
}

// Wywołanie aktualizacji tablicy wyników
updateLeaderboard();
