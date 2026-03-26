import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  const PORT = process.env.PORT || 3000;

  // Game state
  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("createRoom", ({ selectedSymbol }) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const creatorSymbol = selectedSymbol;
      const joinerSymbol = creatorSymbol === 'X' ? 'O' : 'X';
      rooms.set(roomId, {
        players: { [creatorSymbol]: socket.id, [joinerSymbol]: null },
        board: Array(9).fill(null),
        turn: 'X',
        winner: null,
        winningLine: null,
        scores: { [socket.id]: 0 }
      });
      socket.join(roomId);
      socket.emit("roomCreated", { roomId, symbol: creatorSymbol });
    });

    socket.on("joinRoom", (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        // Find the remaining symbol (the one that's null)
        const joinerSymbol = room.players.X === null ? 'X' : 'O';
        if (room.players[joinerSymbol] === null) {
          room.players[joinerSymbol] = socket.id;
          room.scores[socket.id] = 0;
          socket.join(roomId);
          socket.emit("roomJoined", { roomId, symbol: joinerSymbol });
          io.to(roomId).emit("gameStart", { board: room.board, turn: room.turn, scores: room.scores });
        } else {
          socket.emit("error", "Room is full");
        }
      } else {
        socket.emit("error", "Room not found");
      }
    });

    socket.on("makeMove", ({ roomId, index }) => {
      const room = rooms.get(roomId);
      if (!room || room.winner) return;

      const symbol = room.players.X === socket.id ? 'X' : (room.players.O === socket.id ? 'O' : null);
      if (!symbol || room.turn !== symbol || room.board[index]) return;

      room.board[index] = symbol;
      
      // Check win
      const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6] // diagonals
      ];
      
      let winner = null;
      let winningLine = null;
      for (const [a, b, c] of lines) {
        if (room.board[a] && room.board[a] === room.board[b] && room.board[a] === room.board[c]) {
          winner = symbol;
          winningLine = [a, b, c];
          break;
        }
      }

      if (!winner && !room.board.includes(null)) {
        winner = 'draw';
      }

      if (winner && winner !== 'draw') {
        room.scores[socket.id]++;
      }

      room.winner = winner;
      room.winningLine = winningLine;
      room.turn = symbol === 'X' ? 'O' : 'X';

      io.to(roomId).emit("gameState", {
        board: room.board,
        turn: room.turn,
        winner: room.winner,
        winningLine: room.winningLine,
        scores: room.scores
      });
    });

    socket.on("restartGame", ({ roomId, selectedSymbol }) => {
      const room = rooms.get(roomId);
      if (room && (room.players.X === socket.id || room.players.O === socket.id)) {
        const requesterId = socket.id;
        const otherPlayerId = room.players.X === requesterId ? room.players.O : room.players.X;
        
        const requesterSymbol = selectedSymbol;
        const otherSymbol = requesterSymbol === 'X' ? 'O' : 'X';
        
        room.players = { [requesterSymbol]: requesterId, [otherSymbol]: otherPlayerId };
        room.board = Array(9).fill(null);
        room.turn = 'X';
        room.winner = null;
        room.winningLine = null;
        
        io.to(requesterId).emit("gameRestart", {
          symbol: requesterSymbol,
          board: room.board,
          turn: room.turn,
          scores: room.scores
        });
        io.to(otherPlayerId).emit("gameRestart", {
          symbol: otherSymbol,
          board: room.board,
          turn: room.turn,
          scores: room.scores
        });
      }
    });

    socket.on("disconnect", () => {
      // Find room and notify other player
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.X === socket.id || room.players.O === socket.id) {
          io.to(roomId).emit("playerDisconnected");
          rooms.delete(roomId);
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
