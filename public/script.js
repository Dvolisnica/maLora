const suits = ["♥", "♦", "♣", "♠"];
const ranks = ["7", "8", "9", "10", "J", "Q", "K", "A"];

const gameSequence = [
  "herc",
  "dame",
  "stoVise",
  "stoManje",
  "zandarTref",
  "kraljHerc",
  "lora",
  "izbor"
];

let players = [];
let deck = [];

let gameIndex = 0;
let currentGame = null;
let dealerIndex = 0;

let currentPlayerIndex = 0;
let cardsOnTable = [];
let currentSuit = null;
let trickCount = 0;
let winnerOfLastTrick = null;
let playerId = null;

let playerHand = [];
let currentTurn = 0;

const socket = io("https://shaded-rose-open.glitch.me/");

function requestPlayerName() {
  let playerName = prompt("Unesite svoje ime:", "Igrač");
  if (!playerName) playerName = "Igrač";
  socket.emit("joinRoom", { roomId: "room123", playerName });
}
// 📢 Kada se igrači pridruže sobi
socket.on("updateRoom", (playerList) => {
  players = playerList;
  renderPlayers();
  if (players.length === 4) {
    socket.emit("startGame", "room123");
  }
});


socket.on("gameStarted", (room) => {
  playerHand = room.players.find(p => p.id === playerId)?.hand || [];
  currentTurn = room.gameState.currentTurn;
  renderPlayers();
});

// 🎭 Prikaz pozicija igrača
function renderPlayers() {
  const positions = ["top-player", "left-player", "right-player", "bottom-player"];
  players.forEach((player, index) => {
    const position = document.getElementById(positions[index]);
    position.innerHTML = `<strong>${player.name}</strong>`;
  });
}

// 🚀 Bacanje karata
function playCard(card) {
  if (playerId !== players[currentTurn].id) {
    alert("❌ Nije tvoj potez!");
    return;
  }

  playerHand = playerHand.filter(c => c.suit !== card.suit || c.rank !== card.rank);
  socket.emit("playCard", { roomId: "room123", card });

  const table = document.getElementById("cards-on-table");
  let cardEl = document.createElement("div");
  cardEl.classList.add("card", "throw-animation");
  cardEl.textContent = `${card.rank}${card.suit}`;
  table.appendChild(cardEl);
}

document.getElementById("choose-game").addEventListener("click", () => {
  let choice = prompt("Izaberi igru (1-7): ");
  socket.emit("gameChosen", { roomId: "room123", game: choice });
});

socket.on("connect", () => {
  console.log("✅ Povezan na server:", socket.id);
  playerId = socket.id;
  requestPlayerName();
});
socket.on("updateRoom", (players) => {
  console.log("Igrači u sobi:", players);
});

socket.on("gameStarted", (room) => {
  console.log("Igra počela! Tvoje karte:", room.players.find(p => p.id === socket.id).hand);
});

socket.on("updateGame", (gameState) => {
  console.log("Novo stanje igre:", gameState);
});




class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.value = ranks.indexOf(rank) + 1;
  }
  get cardName() {
    return `${this.rank}${this.suit}`;
  }
}

class Player {
  constructor(name) {
    this.name = name;
    this.hand = [];
    this.takenCards = [];
    this.score = 0;
  }
}

function createDeck() {
  const d = [];
  for (let s of suits) {
    for (let r of ranks) {
      d.push(new Card(s, r));
    }
  }
  return d;
}

function shuffleDeck(d) {
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function startMatch() {
  players = [
    new Player("P1"),
    new Player("P2"),
    new Player("P3"),
    new Player("P4")
  ];
  dealerIndex = 0;
  gameIndex = 0;
  startRound();
}

function startRound() {
  currentPlayerIndex = 0;
  cardsOnTable = [];
  currentSuit = null;
  trickCount = 0;
  winnerOfLastTrick = null;
  currentGame = gameSequence[gameIndex];

  deck = createDeck();
  shuffleDeck(deck);
  players.forEach(p => {
    p.hand = [];
    p.takenCards = [];
  });
  dealCards();

  currentPlayerIndex = (dealerIndex + 1) % players.length;

  if (currentGame === "lora") {
    alert("LORA runda - placeholder za specijalna pravila!");
  }
  renderAll();
}

function dealCards() {
  for (let i = 0; i < 8; i++) {
    for (let p = 0; p < players.length; p++) {
      const card = deck.pop();
      players[p].hand.push(card);
    }
  }
}

function onCardClick(card, player, cardIndex) {
  if (currentGame === "lora") {
    alert("Specijalna LORA mehanika (placeholder)!");
    return;
  }
  if (cardsOnTable.length === 0) {
    currentSuit = card.suit;
  } else {
    const hasSuit = player.hand.some(c => c.suit === currentSuit);
    if (hasSuit && card.suit !== currentSuit) {
      alert("Moraš pratiti boju!");
      return;
    }
  }

  player.hand.splice(cardIndex, 1);
  cardsOnTable.push({ card, playerIndex: currentPlayerIndex });

  renderAll();

  if (cardsOnTable.length === players.length) {
    endTrick();
  } else {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    renderAll();
  }
}

function endTrick() {
  let winningCardObj = null;
  for (let obj of cardsOnTable) {
    if (obj.card.suit === currentSuit) {
      if (!winningCardObj || obj.card.value > winningCardObj.card.value) {
        winningCardObj = obj;
      }
    }
  }

  const winnerIndex = winningCardObj.playerIndex;
  winnerOfLastTrick = winnerIndex;

  cardsOnTable.forEach(obj => {
    players[winnerIndex].takenCards.push(obj.card);
  });

  cardsOnTable = [];
  currentSuit = null;
  trickCount++;
  currentPlayerIndex = winnerIndex;

  if (trickCount === 8) {
    endRound();
  } else {
    renderAll();
  }
}

function endRound() {
  scoreRound(currentGame);
  let msg = "Kraj runde: " + currentGame.toUpperCase() + "\n";
  players.forEach(p => {
    msg += `${p.name}: ${p.score} poena\n`;
  });
  alert(msg);

  gameIndex++;
  if (gameIndex >= 8) {
    dealerIndex = (dealerIndex + 1) % players.length;
    gameIndex = 0;
  }
  startRound();
}

function scoreRound(game) {
  switch (game) {
    case "herc":
      scoreHearts();
      break;
    case "dame":
      scoreQueens();
      break;
    case "stoVise":
      scoreMostTricks();
      break;
    case "stoManje":
      scoreFewestTricks();
      break;
    case "zandarTref":
      scoreJackClubsAndLastTrick();
      break;
    case "kraljHerc":
      scoreKingHeartsAndLastTrick();
      break;
    case "lora":
      scoreLora();
      break;
    case "izbor":
      chooseGame();
      break;
  }
}

function scoreHearts() {
  players.forEach(p => {
    let penalty = 0;
    p.takenCards.forEach(c => {
      if (c.suit === "♥") penalty++;
    });
    p.score += penalty;
  });
}

function scoreQueens() {
  players.forEach(p => {
    let penalty = 0;
    p.takenCards.forEach(c => {
      if (c.rank === "Q") penalty++;
    });
    p.score += penalty;
  });
}

function scoreMostTricks() {
  players.forEach(p => {
    const tricks = Math.floor(p.takenCards.length / 4);
    p.score += tricks * -1;
  });
}

function scoreFewestTricks() {
  players.forEach(p => {
    const tricks = Math.floor(p.takenCards.length / 4);
    p.score += tricks;
  });
}

function scoreJackClubsAndLastTrick() {
  players.forEach((p, i) => {
    let penalty = 0;
    const hasJackClubs = p.takenCards.some(c => c.rank === "J" && c.suit === "♣");
    if (hasJackClubs) penalty += 4;
    if (i === winnerOfLastTrick) penalty += 4;
    p.score += penalty;
  });
}

function scoreKingHeartsAndLastTrick() {
  players.forEach((p, i) => {
    let penalty = 0;
    const hasKingHearts = p.takenCards.some(c => c.rank === "K" && c.suit === "♥");
    if (hasKingHearts) penalty += 4;
    if (i === winnerOfLastTrick) penalty += 4;
    p.score += penalty;
  });
}

function scoreLora() {
  alert("Bodovanje LORA: placeholder logika.");
}

function chooseGame() {
  let choice = prompt("Koju igru ponavljamo? (1=Herc, 2=Dame, 3=Što više, 4=Što manje, 5=Žandar tref, 6=Kralj herc, 7=Lora)", "1");
  switch (choice) {
    case "1": scoreHearts(); break;
    case "2": scoreQueens(); break;
    case "3": scoreMostTricks(); break;
    case "4": scoreFewestTricks(); break;
    case "5": scoreJackClubsAndLastTrick(); break;
    case "6": scoreKingHeartsAndLastTrick(); break;
    case "7": scoreLora(); break;
    default: alert("Nepoznat izbor!");
  }
}

function renderAll() {
  renderScoreboard();
  renderTable();
  renderHands();
}

function renderScoreboard() {
  const sb = document.getElementById("scoreboard");
  if (!sb) return;
  sb.innerHTML = `
    <h2>Scoreboard</h2>
    <p>Igra: <strong>${currentGame.toUpperCase()}</strong></p>
    <p>Delilac: ${players[dealerIndex].name}</p>
    <p>Na potezu: ${players[currentPlayerIndex].name}</p>
    <ul>
      ${players.map(p => `<li>${p.name}: ${p.score} poena</li>`).join("")}
    </ul>
  `;
}

function renderTable() {
  const tableDiv = document.getElementById("table");
  if (!tableDiv) return;
  tableDiv.innerHTML = "";
  cardsOnTable.forEach(obj => {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card", "deal-effect");
    if (obj.card.suit === "♥" || obj.card.suit === "♦") {
      cardEl.classList.add("red-suit");
    } else {
      cardEl.classList.add("black-suit");
    }
    cardEl.textContent = obj.card.cardName;
    tableDiv.appendChild(cardEl);
  });
}

function renderHands() {
  const playerHandDiv = document.getElementById("player-hand");
  if (!playerHandDiv) return;
  playerHandDiv.innerHTML = "";
  const currentPlayer = players[currentPlayerIndex];

  currentPlayer.hand.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card", "deal-effect");
    if (card.suit === "♥" || card.suit === "♦") {
      cardEl.classList.add("red-suit");
    } else {
      cardEl.classList.add("black-suit");
    }
    cardEl.textContent = card.cardName;
    cardEl.addEventListener("click", () => onCardClick(card, currentPlayer, index));
    playerHandDiv.appendChild(cardEl);
  });
}

document.getElementById("start-match").addEventListener("click", startMatch);

