// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, update, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

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

// Funkcja do pobierania adresu IP użytkownika
async function getUserIP() {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        return data.ip.replace(/\./g, "_"); // Zamiana kropek na podkreślenia
    } catch (error) {
        console.error("Nie udało się pobrać adresu IP:", error);
        return null;
    }
}

// Funkcja do zapisywania wyniku w Firebase
async function saveScoreToFirebase(nick, score) {
    const userIP = await getUserIP();
    if (!userIP) {
        alert("Nie udało się uzyskać adresu IP użytkownika.");
        return;
    }

    const userRef = ref(db, `leaderboard/${userIP}`);
    update(userRef, { nick, score })
        .then(() => console.log("Nick i wynik zapisano pomyślnie."))
        .catch((error) => {
            console.error("Błąd zapisu do Firebase:", error);
            alert("Nie udało się zapisać wyniku. Spróbuj ponownie później.");
        });
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
            const sortedData = Object.values(data).sort((a, b) => b.score - a.score);
            sortedData.forEach((entry) => {
                const row = document.createElement("tr");
                row.innerHTML = `<td>${entry.nick}</td><td>${entry.score}</td>`;
                leaderboardTable.appendChild(row);
            });
        }
    });
}

// Zmienna globalna reprezentująca liczbę "Buszonków"
let coins = 0;
let lastSavedScore = 0;

// Inicjalizacja po załadowaniu DOM
document.addEventListener("DOMContentLoaded", () => {
    const submitButton = document.getElementById("submitNick");
    const nickInput = document.getElementById("playerNick");

    if (submitButton && nickInput) {
        submitButton.addEventListener("click", () => {
            const nick = nickInput.value.trim();
            if (!nick) {
                alert("Podaj prawidłowy nick!");
                return;
            }
            saveScoreToFirebase(nick, coins);
        });

        // Automatyczny zapis wyniku co 10 sekund
      setInterval(() => {
    const nick = nickInput.value.trim();
    if (nick && coins !== lastSavedScore) {
        saveScoreToFirebase(nick, coins); // Upewnij się, że zapisujesz aktualną wartość "coins"
        lastSavedScore = coins;
    }
}, 10000);

    // Inicjalizacja tablicy wyników
    updateLeaderboard();
});