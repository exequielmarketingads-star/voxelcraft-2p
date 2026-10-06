const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Room management
const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Simple procedural world seed
function generateWorldSeed() {
  return Math.floor(Math.random() * 999999);
}

wss.on('connection', (ws) => {
  ws.id = Math.random().toString(36).substr(2, 9);
  ws.roomCode = null;
  ws.playerIndex = null;

  function send(data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function broadcast(roomCode, data, excludeSelf = false) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.players.forEach(p => {
      if (excludeSelf && p === ws) return;
      if (p.readyState === WebSocket.OPEN) p.send(JSON.stringify(data));
    });
  }

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        const code = generateRoomCode();
        const seed = generateWorldSeed();
        rooms.set(code, {
          code,
          seed,
          players: [ws],
          blocks: {},        // blockKey -> blockType (0=removed)
          scores: [0, 0],
          started: false,
          chat: []
        });
        ws.roomCode = code;
        ws.playerIndex = 0;
        send({ type: 'room_created', code, seed, playerIndex: 0 });
        break;
      }

      case 'join_room': {
        const code = (msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send({ type: 'error', message: 'Sala no encontrada' }); return; }
        if (room.players.length >= 2) { send({ type: 'error', message: 'Sala llena' }); return; }

        room.players.push(ws);
        ws.roomCode = code;
        ws.playerIndex = 1;

        send({ type: 'room_joined', code, seed: room.seed, playerIndex: 1, blocks: room.blocks });
        // Notify player 0 that opponent joined
        const p0 = room.players[0];
        if (p0 && p0.readyState === WebSocket.OPEN) {
          p0.send(JSON.stringify({ type: 'opponent_joined' }));
        }
        room.started = true;
        broadcast(code, { type: 'game_start', seed: room.seed });
        break;
      }

      case 'player_move': {
        if (!ws.roomCode) return;
        broadcast(ws.roomCode, {
          type: 'opponent_move',
          position: msg.position,
          rotation: msg.rotation,
          playerIndex: ws.playerIndex
        }, true);
        break;
      }

      case 'place_block': {
        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const key = `${msg.x},${msg.y},${msg.z}`;
        room.blocks[key] = msg.blockType;
        broadcast(ws.roomCode, {
          type: 'block_placed',
          x: msg.x, y: msg.y, z: msg.z,
          blockType: msg.blockType,
          playerIndex: ws.playerIndex
        }, true);
        break;
      }

      case 'remove_block': {
        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const key = `${msg.x},${msg.y},${msg.z}`;
        delete room.blocks[key];
        broadcast(ws.roomCode, {
          type: 'block_removed',
          x: msg.x, y: msg.y, z: msg.z,
          playerIndex: ws.playerIndex
        }, true);
        break;
      }

      case 'chat': {
        if (!ws.roomCode) return;
        const safe = String(msg.text || '').substring(0, 120).replace(/</g, '&lt;');
        broadcast(ws.roomCode, {
          type: 'chat',
          text: safe,
          playerIndex: ws.playerIndex
        });
        break;
      }

      case 'reaction': {
        if (!ws.roomCode) return;
        broadcast(ws.roomCode, {
          type: 'reaction',
          emoji: msg.emoji,
          playerIndex: ws.playerIndex
        }, true);
        break;
      }

      case 'score_update': {
        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        room.scores[ws.playerIndex] = msg.score;
        broadcast(ws.roomCode, {
          type: 'score_update',
          scores: room.scores
        });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    room.players = room.players.filter(p => p !== ws);
    if (room.players.length === 0) {
      rooms.delete(ws.roomCode);
    } else {
      room.players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: 'opponent_left' }));
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`VoxelCraft server on port ${PORT}`));
