import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMPmNPLGHrBBU3d2DNgq1rutE5R5fBAWc",
  authDomain: "buszkoclicker.firebaseapp.com",
  projectId: "buszkoclicker",
  storageBucket: "buszkoclicker.firebasestorage.app",
  messagingSenderId: "951563794729",
  appId: "1:951563794729:web:f02b247e6cc5c16cf41f38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function getUserIP() {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("Nie udało się pobrać adresu IP:", error);
        return null;
    }
}

async function saveScoreToFirebase(nick, score) {
    const userIP = await getUserIP();
    if (!userIP) {
        alert("Nie udało się uzyskać adresu IP użytkownika.");
        return;
    }

    const userRef = ref(db, `leaderboard/${userIP}`);
    update(userRef, { nick, score })
        .then(() => {
            console.log("Nick i wynik zapisano pomyślnie.");
        })
        .catch((error) => {
            console.error("Błąd zapisu do Firebase:", error);
        });
}

function updateLeaderboard() {
    const leaderboardRef = ref(db, "leaderboard");
    onValue(leaderboardRef, (snapshot) => {
        const leaderboardTable = document.querySelector("#leaderboardTable tbody");
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

document.getElementById("submitNick").addEventListener("click", () => {
    const nick = document.getElementById("playerNick").value.trim();
    if (!nick) {
        alert("Podaj prawidłowy nick!");
        return;
    }
    saveScoreToFirebase(nick, coins); // `coins` to liczba Buszonków
});

setInterval(() => {
    const nick = document.getElementById("playerNick").value.trim();
    if (nick) {
        saveScoreToFirebase(nick, coins);
    }
}, 10000); // Co 10 sekund

document.addEventListener("DOMContentLoaded", () => {
    updateLeaderboard();
});
