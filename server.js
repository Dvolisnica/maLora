const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 🚀 SERVIRA FRONTEND (HTML, CSS, JS)
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Skladištenje aktivnih soba
let rooms = {};

io.on("connection", (socket) => {
  console.log("🆕 Novi igrač povezan:", socket.id);

  // 📌 IGRAČ SE PRIDRUŽUJE SOBI
  socket.on("joinRoom", ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        deck: [],
        gameState: {},
        currentTurn: 0
      };
    }

    let room = rooms[roomId];

    if (room.players.length >= 4) {
      socket.emit("roomFull");
      return;
    }

    room.players.push({ id: socket.id, hand: [], name: playerName });
    socket.join(roomId);
    console.log(`👤 ${playerName} (ID: ${socket.id}) se pridružio sobi ${roomId}`);

    io.to(roomId).emit("updateRoom", room.players);
  });

  // 📌 IGRAČ BIRA IGRU (ISPRAVNO)
  socket.on("gameChosen", ({ roomId, game }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].gameState.currentGame = game;
    io.to(roomId).emit("updateGame", rooms[roomId].gameState);
    console.log(`📢 Igra "${game}" je izabrana u sobi ${roomId}`);
  });

  // 📌 IGRAČ BACA KARTU
  socket.on("playCard", (data) => {
    const { roomId, card } = data;
    let room = rooms[roomId];
    if (!room) return;

    if (socket.id !== room.players[room.currentTurn].id) return;

    room.gameState.cardsOnTable.push({ card, playerId: socket.id });
    room.currentTurn = (room.currentTurn + 1) % 4;

    if (room.gameState.cardsOnTable.length === 4) {
      resolveTrick(roomId);
    }

    io.to(roomId).emit("updateGame", room.gameState);
  });

  // 📌 IGRAČ SE DISKONEKTUJE
  socket.on("disconnect", () => {
    console.log("❌ Igrač diskonektovan:", socket.id);
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit("updateRoom", rooms[roomId].players);
    }
  });
});
function resolveTrick(roomId) {
  let room = rooms[roomId];
  room.gameState.cardsOnTable = [];
  io.to(roomId).emit("updateGame", room.gameState);
}
server.listen(3000, () => {
  console.log("✅ Server pokrenut na portu 3000");
});
