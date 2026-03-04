/**
 * FLIPEEK — Server Node.js + Socket.io
 * Jalankan: npm install && npm start
 * Buka:     http://localhost:3000
 */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// IN-MEMORY STATE
// ─────────────────────────────────────────────
const rooms   = {};
const players = {};

// ─────────────────────────────────────────────
// KONSTANTA
// ─────────────────────────────────────────────
// Semua icon yang MUNGKIN dipakai (pool besar)
const ALL_ICONS = [
  '🌟','🍀','🦊','🔥','💎','🌈','🎭','⚡',
  '🌸','🦋','🍄','🎲','🦅','🌙','💫','🎪','🐉','🌊'
];

const COLORS     = ['#ff6b35','#06d6a0','#118ab2','#ffd700','#7b2d8b','#ef476f','#a8dadc','#f7c59f'];
const WIN_SCORE  = 10;
const TURN_MS    = 30000;
const PEEK_MS    = 2000;
const FLIP_MS    = 3500;
const BOARD_SIZE = 9;

const TARGET_NAMES = [
  'Kombinasi Sakti','Ramuan Rahasia','Formula Ajaib','Mantra Kuno',
  'Resep Tersembunyi','Kode Misteri','Pola Langka','Formasi Khusus',
  'Susunan Legendaris','Koleksi Langka','Set Terpilih','Rangkaian Istimewa',
  'Paduan Serasi','Harmoni Sempurna','Sinergi Kuat','Kombo Dahsyat',
  'Trio Maut','Quartet Andal','Quintet Perkasa','Septet Ajaib',
];
let nameCounter = 0;
function nextTargetName() {
  return TARGET_NAMES[nameCounter++ % TARGET_NAMES.length];
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function uid(n = 6) {
  return Math.random().toString(36).substr(2, n).toUpperCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────
// CORE GAME LOGIC
// ─────────────────────────────────────────────

/**
 * Buat satu set papan + target yang dijamin konsisten.
 * 
 * Alur:
 * 1. Pilih 9 icon acak dari ALL_ICONS → ini SATU-SATUNYA sumber icon papan
 * 2. Buat 3 target, masing-masing ambil subset dari 9 icon tadi
 * 3. Return { board, targets, boardIcons }
 *    boardIcons disimpan di gameState agar bisa dipakai ulang saat refresh target
 */
function createBoardAndTargets() {
  // 1. Pilih tepat 9 icon dari pool
  const boardIcons = shuffle([...ALL_ICONS]).slice(0, BOARD_SIZE);

  // 2. Buat 3 target dari 9 icon itu
  const targets = makeTargets(boardIcons, 3, []);

  // 3. Susun kartu papan (posisi acak)
  const board = shuffle([...boardIcons]).map((icon, i) => ({
    index: i, icon, faceUp: false
  }));

  return { board, boardIcons, targets };
}

/**
 * Buat n target dari boardIcons yang diberikan.
 * Setiap target adalah subset unik dari boardIcons.
 * Ukuran subset: 3 (4 poin), 4 (5 poin), 5 (6 poin)
 */
function makeTargets(boardIcons, n, usedKeys) {
  const results  = [];
  const usedNow  = [...usedKeys];
  const sizes    = [3, 4, 5];
  let   attempts = 0;

  while (results.length < n && attempts < 500) {
    attempts++;
    const size   = sizes[Math.floor(Math.random() * sizes.length)];
    const subset = shuffle([...boardIcons]).slice(0, size);
    const key    = [...subset].sort().join('|'); // separator jelas

    if (usedNow.includes(key)) continue;

    usedNow.push(key);
    results.push({
      name:   nextTargetName(),
      icons:  subset,          // ← subset dari boardIcons, PASTI ada di papan
      points: size === 3 ? 4 : size === 4 ? 5 : 6,
      key,
    });
  }

  return results;
}

/**
 * Acak POSISI kartu di papan, icon tetap sama persis.
 * boardIcons tidak berubah.
 */
function reshuffleBoard(gs) {
  const icons = shuffle(gs.boardIcons); // acak dari sumber tetap
  gs.board = icons.map((icon, i) => ({ index: i, icon, faceUp: false }));
}

/**
 * Ganti 1 target dengan target baru dari boardIcons yang sama.
 * Papan diacak posisinya.
 */
function replaceOneTarget(gs, idx) {
  const usedKeys = gs.targets.map(t => t.key); // hindari target yang masih ada
  const newOnes  = makeTargets(gs.boardIcons, 1, usedKeys);
  if (newOnes.length) {
    gs.targets[idx] = newOnes[0];
  }
  reshuffleBoard(gs);
}

/**
 * Ganti SEMUA target + acak papan.
 * boardIcons tetap sama (9 icon yang sama), hanya posisi & target yang berubah.
 */
function replaceAllTargets(gs) {
  gs.targets = makeTargets(gs.boardIcons, 3, []);
  reshuffleBoard(gs);
}

function activePlayers(gs) {
  return gs.players.filter(p => p.status === 'playing');
}

/**
 * Bandingkan dua array icon tanpa peduli urutan.
 */
function iconsMatch(a, b) {
  if (a.length !== b.length) return false;
  const freq = {};
  a.forEach(ic => { freq[ic] = (freq[ic] || 0) + 1; });
  for (const ic of b) {
    if (!freq[ic]) return false;
    freq[ic]--;
  }
  return true;
}

function buildGame(roomPlayers) {
  const order = shuffle(roomPlayers.map(p => p.id));
  const { board, boardIcons, targets } = createBoardAndTargets();

  return {
    round:               1,
    board,
    boardIcons,          // ← simpan 9 icon aktif, TIDAK PERNAH berubah kecuali new game
    targets,
    players:             roomPlayers.map(p => ({ ...p, score: 0, status: 'playing' })),
    playerOrder:         order,
    currentTurnIdx:      0,
    currentTurnPlayerId: order[0],
    turnStartTime:       Date.now(),
  };
}

// ─────────────────────────────────────────────
// TURN MANAGEMENT
// ─────────────────────────────────────────────
function advanceTurn(room) {
  const gs    = room.gameState;
  const order = gs.playerOrder;
  let idx = gs.currentTurnIdx, tries = 0;
  do {
    idx = (idx + 1) % order.length;
    tries++;
  } while (tries < order.length &&
           gs.players.find(p => p.id === order[idx])?.status !== 'playing');

  gs.currentTurnIdx      = idx;
  gs.currentTurnPlayerId = order[idx];
  gs.round++;
  gs.turnStartTime       = Date.now();

  clearTimeout(room.turnTimer);
  room.turnTimer = setTimeout(() => {
    if (!room.gameState) return;
    const cur = room.gameState.players.find(p => p.id === room.gameState.currentTurnPlayerId);
    io.to(room.id).emit('game_log', { msg: `⏰ Waktu giliran ${cur?.name || '?'} habis!` });
    advanceTurn(room);
    io.to(room.id).emit('turn_advanced', turnPayload(room.gameState));
  }, TURN_MS);
}

function turnPayload(gs) {
  return {
    currentTurnIdx:      gs.currentTurnIdx,
    currentTurnPlayerId: gs.currentTurnPlayerId,
    round:               gs.round,
    players:             gs.players,
  };
}

function checkEnd(room) {
  const gs  = room.gameState;
  const act = activePlayers(gs);
  if (gs.players.some(p => p.status === 'winner') && act.length <= 1) {
    if (act.length === 1) act[0].status = 'loser';
    clearTimeout(room.turnTimer);
    io.to(room.id).emit('game_end', { finalState: gs });
    room.status = 'finished';
    return true;
  }
  return false;
}

function cleanRoom(r) {
  return { id: r.id, name: r.name, hostId: r.hostId, players: r.players, status: r.status };
}

// ─────────────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[+] ${socket.id}`);

  socket.on('set_name', ({ name }) => {
    const color = COLORS[Object.keys(players).length % COLORS.length];
    players[socket.id] = { id: socket.id, name: name.trim().slice(0, 20), color };
    socket.emit('name_set', players[socket.id]);
  });

  socket.on('create_room', () => {
    const me = players[socket.id];
    if (!me) return socket.emit('err', { msg: 'Set nama dulu!' });
    const id = uid();
    rooms[id] = {
      id, name: `Room ${me.name}`,
      hostId: socket.id,
      players: [{ ...me }],
      status: 'waiting',
      gameState: null,
      turnTimer: null,
    };
    socket.join(id);
    socket.currentRoom = id;
    socket.emit('room_created', { room: cleanRoom(rooms[id]) });
  });

  socket.on('list_rooms', () => {
    const list = Object.values(rooms)
      .filter(r => r.status === 'waiting')
      .map(r => ({ id: r.id, name: r.name, playerCount: r.players.length }));
    socket.emit('rooms_list', { rooms: list });
  });

  socket.on('join_room', ({ roomId }) => {
    const me   = players[socket.id];
    const room = rooms[roomId];
    if (!me)                    return socket.emit('err', { msg: 'Set nama dulu!' });
    if (!room)                  return socket.emit('err', { msg: 'Room tidak ditemukan!' });
    if (room.status !== 'waiting') return socket.emit('err', { msg: 'Game sudah dimulai!' });
    if (room.players.length >= 8)  return socket.emit('err', { msg: 'Room penuh!' });
    if (room.players.find(p => p.id === socket.id)) return;

    me.color = COLORS[room.players.length % COLORS.length];
    room.players.push({ ...me });
    socket.join(roomId);
    socket.currentRoom = roomId;

    socket.emit('room_joined', { room: cleanRoom(room) });
    socket.to(roomId).emit('player_joined', { player: { ...me } });
    io.to(roomId).emit('room_chat', { sender: null, msg: `${me.name} bergabung!`, system: true });
  });

  socket.on('room_chat', ({ msg }) => {
    const room = rooms[socket.currentRoom];
    const me   = players[socket.id];
    if (!room || !me || !msg.trim()) return;
    io.to(room.id).emit('room_chat', { sender: me.name, msg: msg.trim().slice(0, 200), system: false });
  });

  socket.on('start_game', () => {
    const room = rooms[socket.currentRoom];
    if (!room || room.hostId !== socket.id || room.players.length < 2 || room.status !== 'waiting') return;

    room.gameState = buildGame(room.players);
    room.status    = 'playing';
    io.to(room.id).emit('game_start', { gameState: room.gameState });

    // Log info ke console untuk debug
    const gs = room.gameState;
    console.log(`[Game] Room ${room.id} mulai`);
    console.log(`  Board icons (9): ${gs.boardIcons.join(' ')}`);
    gs.targets.forEach((t, i) => {
      console.log(`  Target ${i+1}: ${t.name} → ${t.icons.join(' ')} (${t.points} poin)`);
    });

    room.turnTimer = setTimeout(() => {
      if (!room.gameState) return;
      advanceTurn(room);
      io.to(room.id).emit('turn_advanced', turnPayload(room.gameState));
    }, TURN_MS);
  });

  // ── PEEK ──
  socket.on('action_peek', ({ cardIdx }) => {
    const room = rooms[socket.currentRoom];
    const gs   = room?.gameState;
    const me   = players[socket.id];
    if (!gs || !me) return;
    if (gs.currentTurnPlayerId !== socket.id) return socket.emit('err', { msg: 'Bukan giliranmu!' });
    if (gs.board[cardIdx]?.faceUp)            return socket.emit('err', { msg: 'Kartu sudah terbuka!' });

    clearTimeout(room.turnTimer);
    socket.emit('peek_reveal', { cardIdx, icon: gs.board[cardIdx].icon });
    socket.to(room.id).emit('game_log', { msg: `👁️ ${me.name} mengintip 1 kartu...` });

    setTimeout(() => {
      socket.emit('peek_hide', { cardIdx });
      advanceTurn(room);
      io.to(room.id).emit('turn_advanced', turnPayload(gs));
    }, PEEK_MS);
  });

  // ── FLIP ──
  socket.on('action_flip', ({ cardIdxs }) => {
    const room = rooms[socket.currentRoom];
    const gs   = room?.gameState;
    const me   = players[socket.id];
    if (!gs || !me) return;
    if (gs.currentTurnPlayerId !== socket.id)          return socket.emit('err', { msg: 'Bukan giliranmu!' });
    if (!Array.isArray(cardIdxs) || cardIdxs.length !== 2) return socket.emit('err', { msg: 'Pilih 2 kartu!' });
    if (cardIdxs.some(i => gs.board[i]?.faceUp))      return socket.emit('err', { msg: 'Kartu sudah terbuka!' });

    clearTimeout(room.turnTimer);
    cardIdxs.forEach(i => { gs.board[i].faceUp = true; });
    const icons = cardIdxs.map(i => gs.board[i].icon);
    io.to(room.id).emit('flip_reveal', { cardIdxs, icons });
    io.to(room.id).emit('game_log', { msg: `🔄 ${me.name} membuka: ${icons.join(' & ')}` });

    setTimeout(() => {
      cardIdxs.forEach(i => { gs.board[i].faceUp = false; });
      io.to(room.id).emit('flip_hide', { cardIdxs });
      advanceTurn(room);
      io.to(room.id).emit('turn_advanced', turnPayload(gs));
    }, FLIP_MS);
  });

  // ── CLAIM ──
  socket.on('action_claim', ({ targetIdx, cardIdxs }) => {
    const room   = rooms[socket.currentRoom];
    const gs     = room?.gameState;
    const me     = players[socket.id];
    if (!gs || !me) return;
    if (gs.currentTurnPlayerId !== socket.id) return socket.emit('err', { msg: 'Bukan giliranmu!' });

    const target = gs.targets[targetIdx];
    if (!target) return socket.emit('err', { msg: 'Target tidak valid!' });
    if (cardIdxs.length !== target.icons.length)
      return socket.emit('err', { msg: `Pilih tepat ${target.icons.length} kartu!` });

    clearTimeout(room.turnTimer);

    cardIdxs.forEach(i => { gs.board[i].faceUp = true; });
    const chosen = cardIdxs.map(i => gs.board[i].icon);
    io.to(room.id).emit('claim_reveal', { cardIdxs, icons: chosen, targetIdx });
    io.to(room.id).emit('game_log', { msg: `🎯 ${me.name} mencoba klaim "${target.name}"...` });

    console.log(`  [Claim] Target: ${target.icons.join(' ')} | Dipilih: ${chosen.join(' ')} | Match: ${iconsMatch(target.icons, chosen)}`);

    const correct = iconsMatch(target.icons, chosen);

    setTimeout(() => {
      if (correct) {
        const p = gs.players.find(pl => pl.id === socket.id);
        p.score += target.points;
        if (p.score >= WIN_SCORE) {
          p.status = 'winner';
          io.to(room.id).emit('game_log', { msg: `🏆 ${me.name} MENANG dengan ${p.score} poin!` });
        }

        replaceOneTarget(gs, targetIdx);

        io.to(room.id).emit('claim_success', {
          playerId: socket.id, targetIdx, points: target.points,
          newScore: p.score, isWinner: p.status === 'winner',
          newBoard: gs.board, newTargets: gs.targets, players: gs.players,
        });
        io.to(room.id).emit('game_log', { msg: `✅ ${me.name} klaim "${target.name}" (+${target.points} poin)!` });

        if (!checkEnd(room)) {
          advanceTurn(room);
          io.to(room.id).emit('turn_advanced', turnPayload(gs));
        }
      } else {
        replaceAllTargets(gs);

        io.to(room.id).emit('claim_fail', {
          playerId: socket.id, newBoard: gs.board, newTargets: gs.targets,
        });
        io.to(room.id).emit('game_log', { msg: `❌ ${me.name} GAGAL klaim "${target.name}"! Papan & target diacak.` });

        advanceTurn(room);
        io.to(room.id).emit('turn_advanced', turnPayload(gs));
      }
    }, 1500);
  });

  socket.on('game_chat', ({ msg }) => {
    const room = rooms[socket.currentRoom];
    const me   = players[socket.id];
    if (!room || !me || !msg.trim()) return;
    io.to(room.id).emit('game_chat', { sender: me.name, msg: msg.trim().slice(0, 150) });
  });

  socket.on('leave_room', () => handleLeave(socket));
  socket.on('disconnect', () => {
    handleLeave(socket);
    delete players[socket.id];
  });

  function handleLeave(socket) {
    const roomId = socket.currentRoom;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];
    const me   = players[socket.id];

    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(roomId);
    socket.currentRoom = null;

    if (me) {
      io.to(roomId).emit('player_left', { playerId: socket.id, name: me.name });
      io.to(roomId).emit('room_chat', { sender: null, msg: `${me.name} meninggalkan room.`, system: true });
    }

    if (room.gameState) {
      const gp = room.gameState.players.find(p => p.id === socket.id);
      if (gp) {
        gp.status = 'left';
        io.to(roomId).emit('player_status_update', { players: room.gameState.players });
        io.to(roomId).emit('game_log', { msg: `${me?.name || '?'} keluar dari game.` });
      }
      if (room.gameState.currentTurnPlayerId === socket.id) {
        advanceTurn(room);
        io.to(roomId).emit('turn_advanced', turnPayload(room.gameState));
      }
      checkEnd(room);
    }

    if (room.hostId === socket.id && room.players.length > 0) {
      room.hostId = room.players[0].id;
      io.to(roomId).emit('host_changed', { newHostId: room.hostId, name: room.players[0].name });
    }

    if (room.players.length === 0) {
      clearTimeout(room.turnTimer);
      delete rooms[roomId];
    }
  }
});

// Endpoint untuk UptimeRobot agar server tidak tidur
app.get('/ping', (req, res) => res.send('pong 🏓'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎮  Flipeek berjalan di http://localhost:${PORT}\n`);
});