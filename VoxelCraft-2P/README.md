# ⛏️ VoxelCraft 2P

Minecraft-like voxel game that runs in the browser, 2 players via WebSocket.

## Stack
- **Frontend**: Three.js (CDN), Vanilla CSS/JS
- **Backend**: Node.js + Express + ws

## Run locally
```bash
npm install
npm start
# → http://localhost:3000
```

## Deploy on Render
- **Build command**: `npm install`
- **Start command**: `npm start`
- **Environment**: Node

## How to play
1. Open the URL in two browser tabs (or two phones on the same URL)
2. Player 1 clicks **"Crear Mundo"** → gets a 5-letter room code
3. Player 2 enters the code and clicks **"Unirse"**
4. Both land in the same procedurally-generated world — break blocks, chat, react, compete!

## Controls
| Desktop | Mobile |
|---|---|
| WASD / Arrows | D-Pad |
| Space | Jump button |
| Left click | Break block |
| Right click | Place block |
| E | Block picker |
| ESC | Pause |
