const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const timers = new Map();

const categoryConfig = {
  quick: { name: '1. Szybki Strzał', type: 'abcd', time: 15, points: 100, wheel: true },
  social: { name: '2. Sąd Społeczny', type: 'vote', time: 25, points: 100, wheel: true },
  open: { name: '3. Inżynieria i Kalkulacje', type: 'open', time: 35, points: 150, wheel: true },
  globetrotter: { name: '4. Globtroter', type: 'abcd', time: 18, points: 100, wheel: true },
  auction: { name: '5. Licytacja w Dół', type: 'auction', time: 45, points: 0, wheel: true },
  timeline: { name: '6. Historyczna Oś Czasu', type: 'slider', time: 25, points: 120, wheel: true },
  illusion: { name: '7. Iluzja Optyczna', type: 'open', time: 20, points: 150, wheel: true },
  detective: { name: '8. Detektyw Zbiegowisk', type: 'story', time: 40, points: 120, wheel: true },
  biology: { name: '9. Biologia i Ciało', type: 'abcd', time: 8, points: 150, wheel: true },
  debate: { name: '10. Loża Szyderców', type: 'debate', time: 120, points: 80, wheel: true },
  sidequest: { name: '11. Side Quest', type: 'open', time: 20, points: 200, wheel: true },
  final: { name: '12. Finał Finałów', type: 'final_bid', time: 30, points: 500, wheel: false }
};

let questionsDB = [
  { id: 1, category: 'quick', q: 'Jaka jest stolica Australii?', options: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], answer: 'Canberra' },
  { id: 2, category: 'quick', q: 'Który pierwiastek jest najlżejszy?', options: ['Wodór', 'Hel', 'Tlen', 'Lit'], answer: 'Wodór' },
  { id: 3, category: 'globetrotter', q: 'W którym kraju znajduje się Petra?', options: ['Jordania', 'Egipt', 'Syria', 'Liban'], answer: 'Jordania' },
  { id: 4, category: 'biology', q: 'Gdzie znajduje się błędnik odpowiadający za równowagę?', options: ['W uchu wewnętrznym', 'W móżdżku', 'W oku', 'W płucach'], answer: 'W uchu wewnętrznym' },
  { id: 5, category: 'open', q: 'Ojciec i syn mają razem 66 lat. Wiek ojca to wiek syna zapisany od tyłu. Syn jest nastolatkiem. Ile lat ma syn?', answer: '15' },
  { id: 6, category: 'open', q: 'Samochód jedzie połowę trasy 40 km/h, a drugą połowę 60 km/h. Średnia prędkość?', answer: '48' },
  { id: 7, category: 'illusion', q: 'Makro-zagadka: czerwony owoc z pestkami na zewnątrz. Co to?', answer: 'truskawka' },
  { id: 8, category: 'timeline', q: 'W której dekadzie miało miejsce lądowanie Apollo 11 na Księżycu?', answer: '1960', min: 1880, max: 2020, step: 10 },
  { id: 9, category: 'social', q: 'Kto z nas najprawdopodobniej założyłby sektę i od razu ogłosił się liderem?' },
  { id: 10, category: 'social', q: 'Kto najpewniej kłóciłby się z GPS-em i nadal twierdził, że ma rację?' },
  { id: 11, category: 'auction', q: 'Zrób 15 przysiadów w czasie poniżej 20 sekund.' },
  { id: 12, category: 'auction', q: 'Przeczytaj trzy razy bez zająknięcia: Król Karol kupił królowej Karolinie korale koloru koralowego.' },
  { id: 13, category: 'detective', q: 'Napisz najdziwniejszą rzecz, którą kiedyś kupiłeś/kupiłaś w internecie.' },
  { id: 14, category: 'detective', q: 'Napisz miejsce, w którym zdarzyło Ci się zasnąć, a nie powinno.' },
  { id: 15, category: 'debate', q: 'Wiadomości głosowe dłuższe niż minuta bez pytania o zgodę to brak szacunku.' },
  { id: 16, category: 'debate', q: 'Przepisy kulinarne to tylko sugestie. Trzymanie się gramatury jest dla tchórzy.' },
  { id: 17, category: 'sidequest', q: 'Jaka kategoria została dziś wylosowana jako pierwsza?', answer: '__FIRST_CATEGORY__' },
  { id: 18, category: 'final', q: 'Wymień jak najwięcej krajów Unii Europejskiej w 30 sekund.' },
  { id: 19, category: 'final', q: 'Wymień jak najwięcej marek samochodów.' }
];

const secretMissions = [
  'Spraw, aby ktoś przybił Ci piątkę bez tłumaczenia dlaczego.',
  'Wpleć słowo „ortodoksyjny” w naturalną rozmowę.',
  'Przekonaj kogoś, że gra Cię oszukuje.',
  'Doprowadź do sytuacji, w której dwie osoby jednocześnie wstaną.',
  'Rozpocznij klaskanie tak, żeby ktoś się przyłączył.',
  'Spraw, aby ktoś podał Ci napój albo coś ze stołu.',
  'Powiedz kompletną bzdurę i spraw, żeby ktoś przyznał Ci rację.',
  'Zapytaj kogoś o model telefonu i udawaj ogromne zainteresowanie.'
];

const roasts = {
  wrong: ['{name}, ta odpowiedź była odważna. Nie dobra, ale odważna.', '{name} kliknął tak pewnie, jakby miał rację. Nie miał.', 'System sprawdził odpowiedź gracza {name} i potrzebuje chwili ciszy.'],
  noAnswer: ['{name} postanowił przeczekać pytanie jak kontrolę biletów.', '{name} nie odpowiedział. Strategia: udawać, że telefonu nie ma.', 'Czas minął. {name} nadal analizuje życie.'],
  leader: ['{name} prowadzi. Pokój powinien rozważyć sabotaż.', 'Liderem jest {name}. Publiczny wróg numer jeden.', '{name} odjeżdża punktami. Nieprzyjemna sytuacja dla reszty.'],
  last: ['{name} zamyka tabelę. Ktoś musi pilnować tyłów.', '{name} jest ostatni, ale za to konsekwentnie.', 'Na dole tabeli {name} urządził już kawalerkę.'],
  sabotage: ['{from} rzuca sabotaż na {to}. Przyjaźń chwilowo zawieszona.', '{to} właśnie dostał prezent od {from}. Prezent jest z kategorii: cierpienie.', '{from} uznał, że {to} ma dziś za łatwo.']
};

function cleanRoom(value) {
  return String(value || 'MAIN').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24) || 'MAIN';
}
function defaultPlayerInventory() { return { boost: 2, lock: 1, flashbang: 1, shield: 1 }; }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function normalize(value) { return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function formatLine(template, data) { return template.replace(/\{(\w+)\}/g, (_, k) => data[k] ?? ''); }

function freshGameState(room) {
  return {
    room,
    phase: 'lobby',
    paused: false,
    roundNumber: 0,
    maxRounds: 10,
    players: {},
    timer: 0,
    currentCategory: null,
    currentQuestion: null,
    currentType: null,
    forcedNextCategory: null,
    submissions: {},
    votes: {},
    storyPool: [],
    currentStoryIndex: 0,
    auction: { lowestBid: null, winnerSocketId: null },
    finalBid: { leaderId: null, amount: 0 },
    tactical: { activeSabotages: [], roundMessages: [] },
    logs: [],
    usedQuestionIds: [],
    firstCategoryName: null,
    finalStarted: false,
    createdAt: Date.now()
  };
}
function getRoom(roomCode) {
  const room = cleanRoom(roomCode);
  if (!rooms.has(room)) rooms.set(room, freshGameState(room));
  return rooms.get(room);
}
function clearRoomTimer(room) {
  const old = timers.get(room);
  if (old?.interval) clearInterval(old.interval);
  timers.delete(room);
}
function activePlayerIds(state) { return Object.keys(state.players).filter(id => state.players[id].connected !== false); }
function safePlayers(state, forSocketId = null, revealSecrets = false) {
  const players = {};
  Object.entries(state.players).forEach(([id, p]) => {
    players[id] = {
      name: p.name,
      score: p.score,
      answered: p.answered,
      connected: p.connected,
      boostActive: p.boostActive,
      blockedThisRound: p.blockedThisRound,
      flashbangThisRound: p.flashbangThisRound,
      shieldActive: p.shieldActive,
      inventory: forSocketId === id || revealSecrets ? p.inventory : undefined,
      secretMission: forSocketId === id || revealSecrets ? p.secretMission : undefined,
      stats: revealSecrets ? p.stats : undefined
    };
  });
  return players;
}
function publicState(state, forSocketId = null, revealSecrets = false) {
  return { ...state, players: safePlayers(state, forSocketId, revealSecrets) };
}
function emitRoom(room) {
  const state = getRoom(room);
  Object.keys(state.players).forEach(id => io.to(id).emit('updateState', publicState(state, id, false)));
  io.to(`tv:${room}`).emit('tvState', publicState(state, null, true));
  io.to(`admin:${room}`).emit('adminState', publicState(state, null, true));
}
function addRoundMessage(state, kind, data = {}) {
  const line = formatLine(rand(roasts[kind] || roasts.wrong), data);
  state.tactical.roundMessages.push(line);
  state.logs.push({ at: Date.now(), line });
  return line;
}
function resetRoundPlayerFlags(state) {
  Object.values(state.players).forEach(p => {
    p.answered = false;
    p.boostActive = false;
    p.blockedThisRound = false;
    p.flashbangThisRound = false;
    p.shieldActive = false;
  });
}
function chooseCategory(state) {
  if (state.forcedNextCategory && categoryConfig[state.forcedNextCategory]) {
    const forced = state.forcedNextCategory;
    state.forcedNextCategory = null;
    return forced;
  }
  return rand(Object.keys(categoryConfig).filter(k => categoryConfig[k].wheel));
}
function chooseQuestion(state, categoryKey) {
  let pool = questionsDB.filter(q => q.category === categoryKey && !state.usedQuestionIds.includes(q.id));
  if (!pool.length) pool = questionsDB.filter(q => q.category === categoryKey);
  const picked = rand(pool);
  if (picked) state.usedQuestionIds.push(picked.id);
  const q = picked ? { ...picked } : { id: Date.now(), category: categoryKey, q: 'Brak pytania w tej kategorii. Dodaj pytanie w panelu admina.', options: [], answer: '' };
  if (q.answer === '__FIRST_CATEGORY__') q.answer = state.firstCategoryName || '';
  return q;
}
function allRequiredAnswered(state) {
  const ids = activePlayerIds(state);
  if (!ids.length) return false;
  if (['auction', 'debate', 'story'].includes(state.currentType)) return false;
  return ids.every(id => state.players[id].answered || state.players[id].blockedThisRound);
}
function startRoomTimer(room, seconds, onEnd, options = {}) {
  const state = getRoom(room);
  clearRoomTimer(room);
  state.timer = seconds;
  emitRoom(room);
  const interval = setInterval(() => {
    const s = getRoom(room);
    if (s.paused) return;
    s.timer -= 1;
    io.to(room).emit('tick', s.timer);
    io.to(`tv:${room}`).emit('tick', s.timer);
    io.to(`admin:${room}`).emit('tick', s.timer);
    if (options.endWhenAllAnswered && allRequiredAnswered(s)) {
      clearRoomTimer(room);
      onEnd(room);
      return;
    }
    if (s.timer <= 0) {
      clearRoomTimer(room);
      onEnd(room);
    }
  }, 1000);
  timers.set(room, { interval, onEnd, options });
}

function startGame(room) {
  const state = getRoom(room);
  if (!['lobby', 'game_over'].includes(state.phase)) return;
  state.phase = 'secret_intro';
  state.paused = false;
  emitRoom(room);
  startRoomTimer(room, 8, startWheel);
}
function startWheel(room) {
  const state = getRoom(room);
  if (state.roundNumber >= state.maxRounds) return startFinal(room);
  resetRoundPlayerFlags(state);
  state.roundNumber += 1;
  state.phase = 'wheel';
  state.paused = false;
  state.submissions = {};
  state.votes = {};
  state.storyPool = [];
  state.currentStoryIndex = 0;
  state.tactical = { activeSabotages: [], roundMessages: [] };
  state.auction = { lowestBid: null, winnerSocketId: null };
  const categoryKey = chooseCategory(state);
  state.currentCategory = categoryKey;
  state.currentType = categoryConfig[categoryKey].type;
  state.currentQuestion = chooseQuestion(state, categoryKey);
  if (!state.firstCategoryName) state.firstCategoryName = categoryConfig[categoryKey].name;
  emitRoom(room);
  startRoomTimer(room, 5, startTactical);
}
function startTactical(room) {
  const state = getRoom(room);
  state.phase = 'tactical';
  emitRoom(room);
  startRoomTimer(room, 30, startRound);
}
function startRound(room) {
  const state = getRoom(room);
  state.phase = 'round';
  const cfg = categoryConfig[state.currentCategory] || { time: 30 };
  if (state.currentType === 'auction') state.auction.lowestBid = { player: 'Brak licytacji', amount: 100, socketId: null };
  emitRoom(room);
  startRoomTimer(room, cfg.time, finishRound, { endWhenAllAnswered: true });
}
function finishRound(room) {
  const state = getRoom(room);
  if (state.currentType === 'auction') return startAuctionVerify(room);
  if (state.currentType === 'story') return startStoryGuessing(room);
  if (state.currentType === 'debate') return startDebateVoting(room);
  calculateStandardResults(state);
  startResults(room);
}
function calculateStandardResults(state) {
  const cfg = categoryConfig[state.currentCategory] || { points: 100, time: 30 };
  const ids = activePlayerIds(state);
  if (state.currentType === 'vote') {
    const counts = {};
    Object.values(state.votes).forEach(targetId => counts[targetId] = (counts[targetId] || 0) + 1);
    const max = Math.max(0, ...Object.values(counts));
    const winners = Object.keys(counts).filter(id => counts[id] === max && max > 0);
    winners.forEach(id => { if (state.players[id]) state.players[id].score += cfg.points; });
    Object.entries(state.votes).forEach(([voterId, targetId]) => {
      if (winners.includes(targetId) && state.players[voterId]) state.players[voterId].score += Math.floor(cfg.points / 2);
    });
    return;
  }
  ids.forEach(id => {
    const p = state.players[id];
    if (p.blockedThisRound) return addRoundMessage(state, 'noAnswer', { name: p.name });
    const sub = state.submissions[id];
    if (!sub) return addRoundMessage(state, 'noAnswer', { name: p.name });
    const correct = state.currentType === 'slider'
      ? Math.abs(Number(sub.answer) - Number(state.currentQuestion.answer)) <= 10
      : normalize(sub.answer) === normalize(state.currentQuestion.answer);
    if (correct) {
      const elapsed = Math.max(0, cfg.time - sub.timeLeft);
      let pts = Math.max(Math.floor(cfg.points * 0.4), cfg.points - elapsed * 5);
      if (p.boostActive) pts *= 2;
      p.score += pts;
      p.stats.correct++;
      state.logs.push({ at: Date.now(), line: `${p.name} zdobywa ${pts} pkt.` });
    } else {
      p.stats.wrong++;
      if (p.boostActive) p.score -= Math.floor(cfg.points / 2);
      addRoundMessage(state, 'wrong', { name: p.name });
    }
  });
}
function startAuctionVerify(room) {
  const state = getRoom(room);
  state.phase = 'auction_verify';
  emitRoom(room);
}
function resolveAuction(room, success) {
  const state = getRoom(room);
  const bid = state.auction.lowestBid;
  if (bid?.socketId && state.players[bid.socketId]) {
    const p = state.players[bid.socketId];
    if (success) p.score += bid.amount;
    else p.score -= bid.amount;
  }
  startResults(room);
}
function startStoryGuessing(room) {
  const state = getRoom(room);
  const entries = Object.entries(state.submissions).filter(([, s]) => s.answer);
  state.storyPool = entries.map(([authorId, s]) => ({ authorId, text: s.answer }));
  if (!state.storyPool.length) return startResults(room);
  state.phase = 'story_guess';
  state.votes = {};
  state.currentStoryIndex = 0;
  Object.values(state.players).forEach(p => p.answered = false);
  emitRoom(room);
  startRoomTimer(room, 20, resolveCurrentStoryGuess, { endWhenAllAnswered: true });
}
function resolveCurrentStoryGuess(room) {
  const state = getRoom(room);
  const story = state.storyPool[state.currentStoryIndex];
  if (!story) return startResults(room);
  Object.entries(state.votes).forEach(([voterId, guessedAuthor]) => {
    if (voterId !== story.authorId && guessedAuthor === story.authorId && state.players[voterId]) state.players[voterId].score += 100;
  });
  if (state.players[story.authorId]) {
    const wrong = Object.values(state.votes).filter(v => v !== story.authorId).length;
    state.players[story.authorId].score += wrong * 30;
  }
  state.currentStoryIndex++;
  state.votes = {};
  Object.values(state.players).forEach(p => p.answered = false);
  if (state.currentStoryIndex >= state.storyPool.length) return startResults(room);
  emitRoom(room);
  startRoomTimer(room, 20, resolveCurrentStoryGuess, { endWhenAllAnswered: true });
}
function startDebateVoting(room) {
  const state = getRoom(room);
  state.phase = 'debate_vote';
  state.votes = {};
  Object.values(state.players).forEach(p => p.answered = false);
  emitRoom(room);
  startRoomTimer(room, 25, resolveDebateVoting, { endWhenAllAnswered: true });
}
function resolveDebateVoting(room) {
  const state = getRoom(room);
  Object.values(state.votes).forEach(targetId => {
    if (state.players[targetId]) state.players[targetId].score += (categoryConfig[state.currentCategory]?.points || 80);
  });
  startResults(room);
}
function startResults(room) {
  const state = getRoom(room);
  const sorted = Object.values(state.players).sort((a, b) => b.score - a.score);
  if (sorted[0]) addRoundMessage(state, 'leader', { name: sorted[0].name });
  if (sorted.length > 1) addRoundMessage(state, 'last', { name: sorted[sorted.length - 1].name });
  state.phase = 'results';
  emitRoom(room);
  startRoomTimer(room, 9, () => {
    const s = getRoom(room);
    if (s.roundNumber >= s.maxRounds) startFinal(room);
    else startWheel(room);
  });
}
function startFinal(room) {
  const state = getRoom(room);
  state.finalStarted = true;
  state.phase = 'final_auction';
  state.currentCategory = 'final';
  state.currentType = 'final_bid';
  state.currentQuestion = chooseQuestion(state, 'final');
  state.finalBid = { leaderId: null, amount: 0 };
  state.submissions = {};
  resetRoundPlayerFlags(state);
  emitRoom(room);
  startRoomTimer(room, 30, startFinalVerify);
}
function startFinalVerify(room) {
  const state = getRoom(room);
  state.phase = 'final_verify';
  emitRoom(room);
}
function resolveFinal(room, success) {
  const state = getRoom(room);
  const id = state.finalBid.leaderId;
  if (id && state.players[id]) {
    if (success) state.players[id].score += 700;
    else state.players[id].score = Math.floor(state.players[id].score / 2);
  }
  startSecretReveal(room);
}
function startSecretReveal(room) {
  const state = getRoom(room);
  state.phase = 'secret_agent_reveal';
  state.votes = {};
  emitRoom(room);
}
function resolveSecretMission(room, playerId, success) {
  const state = getRoom(room);
  if (state.players[playerId] && success) state.players[playerId].score += 500;
  emitRoom(room);
}
function gameOver(room) {
  const state = getRoom(room);
  state.phase = 'game_over';
  emitRoom(room);
}
function useItem(socket, payload) {
  const room = socket.data.room;
  const state = getRoom(room);
  const p = state.players[socket.id];
  if (!p || state.phase !== 'tactical') return;
  const item = payload?.item;
  const targetId = payload?.targetId;
  if (!p.inventory[item] || p.inventory[item] <= 0) return;
  if (item === 'boost') {
    p.inventory.boost--;
    p.boostActive = true;
    return emitRoom(room);
  }
  if (item === 'shield') {
    p.inventory.shield--;
    p.shieldActive = true;
    return emitRoom(room);
  }
  const target = state.players[targetId];
  if (!target || targetId === socket.id) return;
  p.inventory[item]--;
  p.stats.sabotagesUsed++;
  if (target.shieldActive) {
    target.shieldActive = false;
    state.tactical.roundMessages.push(`${target.name} odbija sabotaż tarczą. ${p.name} właśnie zmarnował sprzęt.`);
  } else if (item === 'lock') {
    target.blockedThisRound = true;
    addRoundMessage(state, 'sabotage', { from: p.name, to: target.name });
  } else if (item === 'flashbang') {
    target.flashbangThisRound = true;
    addRoundMessage(state, 'sabotage', { from: p.name, to: target.name });
  }
  emitRoom(room);
}
function adminResetRoom(room, keepPlayers = true) {
  const oldPlayers = getRoom(room).players;
  clearRoomTimer(room);
  const fresh = freshGameState(room);
  if (keepPlayers) {
    fresh.players = oldPlayers;
    Object.values(fresh.players).forEach(p => {
      p.score = 0;
      p.connected = true;
      p.answered = false;
      p.inventory = defaultPlayerInventory();
      p.secretMission = rand(secretMissions);
      p.stats = { correct: 0, wrong: 0, sabotagesUsed: 0, timesRoasted: 0 };
    });
  }
  rooms.set(room, fresh);
  emitRoom(room);
}
function adminNextRound(room) {
  clearRoomTimer(room);
  const state = getRoom(room);
  if (state.phase === 'lobby') startGame(room);
  else if (state.roundNumber >= state.maxRounds) startFinal(room);
  else startWheel(room);
}

app.get('/api/config', (req, res) => res.json(categoryConfig));
app.get('/api/questions', (req, res) => res.json(questionsDB));
app.post('/api/questions', (req, res) => {
  const q = { id: Date.now(), ...req.body };
  questionsDB.push(q);
  res.json({ success: true, question: q });
});
app.delete('/api/questions/:id', (req, res) => {
  questionsDB = questionsDB.filter(q => String(q.id) !== String(req.params.id));
  res.json({ success: true });
});
app.get('/api/state/:room', (req, res) => res.json(publicState(getRoom(req.params.room), null, true)));
app.get('/api/qr', async (req, res) => {
  try {
    const url = String(req.query.url || '');
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 360 });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    res.status(500).send('QR error');
  }
});

io.on('connection', socket => {
  const room = cleanRoom(socket.handshake.query.room);
  const role = String(socket.handshake.query.role || 'player');
  socket.data.room = room;
  socket.join(room);
  if (role === 'tv') socket.join(`tv:${room}`);
  if (role === 'admin') socket.join(`admin:${room}`);
  const state = getRoom(room);
  socket.emit(role === 'admin' ? 'adminState' : role === 'tv' ? 'tvState' : 'updateState', publicState(state, socket.id, role !== 'player'));

  socket.on('joinGame', playerName => {
    const name = String(playerName || '').trim().slice(0, 24);
    if (!name) return;
    state.players[socket.id] = {
      name,
      score: 0,
      connected: true,
      answered: false,
      boostActive: false,
      blockedThisRound: false,
      flashbangThisRound: false,
      shieldActive: false,
      inventory: defaultPlayerInventory(),
      secretMission: rand(secretMissions),
      stats: { correct: 0, wrong: 0, sabotagesUsed: 0, timesRoasted: 0 }
    };
    emitRoom(room);
  });

  socket.on('tvStartGame', () => startGame(room));
  socket.on('useItem', payload => useItem(socket, payload));

  socket.on('submitAnswer', answer => {
    const s = getRoom(room);
    const p = s.players[socket.id];
    if (!p || p.blockedThisRound) return;
    if (s.phase === 'round') {
      if (s.currentType === 'auction') {
        const amount = parseInt(answer, 10);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const current = s.auction.lowestBid?.amount ?? 100;
        if (amount < current) {
          s.auction.lowestBid = { player: p.name, amount, socketId: socket.id };
          s.auction.winnerSocketId = socket.id;
          io.to(room).emit('auctionUpdate', s.auction.lowestBid);
          io.to(`tv:${room}`).emit('auctionUpdate', s.auction.lowestBid);
          emitRoom(room);
        }
        return;
      }
      if (p.answered && s.currentType !== 'debate') return;
      p.answered = true;
      s.submissions[socket.id] = { answer, timeLeft: s.timer, at: Date.now() };
      emitRoom(room);
      return;
    }
    if (s.phase === 'story_guess' || s.phase === 'debate_vote') {
      s.votes[socket.id] = answer;
      p.answered = true;
      emitRoom(room);
    }
  });
  socket.on('submitVote', targetId => {
    const s = getRoom(room);
    if (!s.players[socket.id]) return;
    if (s.phase === 'round' && s.currentType === 'vote') {
      s.votes[socket.id] = targetId;
      s.players[socket.id].answered = true;
      emitRoom(room);
    }
  });
  socket.on('submitFinalBid', amount => {
    const s = getRoom(room);
    if (s.phase !== 'final_auction') return;
    const bid = parseInt(amount, 10);
    if (!Number.isFinite(bid) || bid <= 0) return;
    s.submissions[socket.id] = { answer: bid, timeLeft: s.timer };
    if (bid > s.finalBid.amount) s.finalBid = { leaderId: socket.id, amount: bid };
    emitRoom(room);
  });

  socket.on('tvAuctionResult', success => resolveAuction(room, success));
  socket.on('tvFinalResult', success => resolveFinal(room, success));
  socket.on('tvSecretResult', ({ playerId, success }) => resolveSecretMission(room, playerId, success));
  socket.on('tvGameOver', () => gameOver(room));

  socket.on('adminStartGame', () => startGame(room));
  socket.on('adminPause', () => { const s = getRoom(room); s.paused = true; emitRoom(room); });
  socket.on('adminResume', () => { const s = getRoom(room); s.paused = false; emitRoom(room); });
  socket.on('adminNextRound', () => adminNextRound(room));
  socket.on('adminResetGame', ({ keepPlayers = true } = {}) => adminResetRoom(room, keepPlayers));
  socket.on('adminSetMaxRounds', value => { const s = getRoom(room); const n = parseInt(value, 10); if (Number.isFinite(n) && n > 0) s.maxRounds = n; emitRoom(room); });
  socket.on('adminForceCategory', categoryKey => { const s = getRoom(room); if (categoryConfig[categoryKey]) s.forcedNextCategory = categoryKey; emitRoom(room); });
  socket.on('adminSetScore', ({ playerId, score }) => { const s = getRoom(room); const n = parseInt(score, 10); if (s.players[playerId] && Number.isFinite(n)) s.players[playerId].score = n; emitRoom(room); });
  socket.on('adminKickPlayer', playerId => { const s = getRoom(room); if (s.players[playerId]) { delete s.players[playerId]; io.to(playerId).emit('kicked'); } emitRoom(room); });
  socket.on('adminAddPoints', ({ playerId, delta }) => { const s = getRoom(room); const n = parseInt(delta, 10); if (s.players[playerId] && Number.isFinite(n)) s.players[playerId].score += n; emitRoom(room); });

  socket.on('disconnect', () => {
    const s = getRoom(room);
    if (s.players[socket.id]) s.players[socket.id].connected = false;
    emitRoom(room);
  });
});

server.listen(PORT, () => console.log(`Party Protocol v2.1 działa na porcie ${PORT}`));
