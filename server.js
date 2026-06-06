const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

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

const defaultPlayerInventory = () => ({ boost: 2, lock: 1, flashbang: 1, shield: 1 });

let gameState = freshGameState();
let timerInterval = null;

function freshGameState() {
  return {
    phase: 'lobby',
    roundNumber: 0,
    maxRounds: 10,
    players: {},
    timer: 0,
    currentCategory: null,
    currentQuestion: null,
    currentType: null,
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
    finalStarted: false
  };
}

function publicState(forSocketId = null) {
  const safePlayers = {};
  Object.entries(gameState.players).forEach(([id, p]) => {
    safePlayers[id] = {
      name: p.name,
      score: p.score,
      answered: p.answered,
      connected: p.connected,
      boostActive: p.boostActive,
      blockedThisRound: p.blockedThisRound,
      flashbangThisRound: p.flashbangThisRound,
      inventory: forSocketId === id ? p.inventory : undefined,
      secretMission: forSocketId === id ? p.secretMission : undefined
    };
  });
  return { ...gameState, players: safePlayers };
}

function emitState() {
  for (const id of Object.keys(gameState.players)) io.to(id).emit('updateState', publicState(id));
  io.emit('tvState', publicState(null));
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function normalize(value) { return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function formatLine(template, data) { return template.replace(/\{(\w+)\}/g, (_, k) => data[k] ?? ''); }
function activePlayerIds() { return Object.keys(gameState.players).filter(id => gameState.players[id].connected); }
function categoryByName(name) { return Object.entries(categoryConfig).find(([, c]) => c.name === name)?.[0] || null; }

function addRoundMessage(kind, data = {}) {
  const line = formatLine(rand(roasts[kind] || roasts.wrong), data);
  gameState.tactical.roundMessages.push(line);
  gameState.logs.push({ at: Date.now(), line });
  return line;
}

function resetRoundPlayerFlags() {
  for (const p of Object.values(gameState.players)) {
    p.answered = false;
    p.boostActive = false;
    p.blockedThisRound = false;
    p.flashbangThisRound = false;
    p.shieldActive = false;
  }
}

function chooseCategory() {
  const keys = Object.keys(categoryConfig).filter(k => categoryConfig[k].wheel);
  return rand(keys);
}

function chooseQuestion(categoryKey) {
  let pool = questionsDB.filter(q => q.category === categoryKey && !gameState.usedQuestionIds.includes(q.id));
  if (!pool.length) pool = questionsDB.filter(q => q.category === categoryKey);
  const q = rand(pool);
  if (q) gameState.usedQuestionIds.push(q.id);
  return q || { id: Date.now(), category: categoryKey, q: 'Brak pytania w tej kategorii. Admin musi coś dodać.', options: [], answer: '' };
}

function clearTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

function startTimer(seconds, onEnd, options = {}) {
  clearTimer();
  gameState.timer = seconds;
  emitState();
  timerInterval = setInterval(() => {
    gameState.timer -= 1;
    io.emit('tick', gameState.timer);
    if (options.endWhenAllAnswered && allRequiredAnswered()) {
      clearTimer();
      onEnd();
      return;
    }
    if (gameState.timer <= 0) {
      clearTimer();
      onEnd();
    }
  }, 1000);
}

function allRequiredAnswered() {
  const ids = activePlayerIds();
  if (!ids.length) return false;
  if (['auction', 'debate', 'story'].includes(gameState.currentType)) return false;
  return ids.every(id => gameState.players[id].answered || gameState.players[id].blockedThisRound);
}

function startGame() {
  if (gameState.phase !== 'lobby' && gameState.phase !== 'game_over') return;
  gameState.phase = 'secret_intro';
  emitState();
  startTimer(8, startWheel);
}

function startWheel() {
  if (gameState.roundNumber >= gameState.maxRounds) return startFinal();
  resetRoundPlayerFlags();
  gameState.roundNumber += 1;
  gameState.phase = 'wheel';
  gameState.submissions = {};
  gameState.votes = {};
  gameState.storyPool = [];
  gameState.currentStoryIndex = 0;
  gameState.tactical = { activeSabotages: [], roundMessages: [] };
  gameState.auction = { lowestBid: null, winnerSocketId: null };

  const categoryKey = chooseCategory();
  gameState.currentCategory = categoryKey;
  gameState.currentType = categoryConfig[categoryKey].type;
  gameState.currentQuestion = chooseQuestion(categoryKey);
  if (!gameState.firstCategoryName) gameState.firstCategoryName = categoryConfig[categoryKey].name;
  if (gameState.currentQuestion.answer === '__FIRST_CATEGORY__') gameState.currentQuestion.answer = gameState.firstCategoryName;
  emitState();
  startTimer(5, startTactical);
}

function startTactical() {
  gameState.phase = 'tactical';
  emitState();
  startTimer(30, startRound);
}

function startRound() {
  gameState.phase = 'round';
  const cfg = categoryConfig[gameState.currentCategory];
  if (gameState.currentType === 'auction') gameState.auction.lowestBid = { player: 'Brak licytacji', amount: 100, socketId: null };
  emitState();
  startTimer(cfg.time, finishRound, { endWhenAllAnswered: true });
}

function finishRound() {
  const type = gameState.currentType;
  if (type === 'auction') return startAuctionVerify();
  if (type === 'story') return startStoryGuessing();
  if (type === 'debate') return startDebateVoting();
  calculateStandardResults();
  startResults();
}

function calculateStandardResults() {
  const cfg = categoryConfig[gameState.currentCategory];
  const ids = activePlayerIds();

  if (gameState.currentType === 'vote') {
    const counts = {};
    Object.values(gameState.votes).forEach(targetId => counts[targetId] = (counts[targetId] || 0) + 1);
    const max = Math.max(0, ...Object.values(counts));
    const winners = Object.keys(counts).filter(id => counts[id] === max && max > 0);
    winners.forEach(id => { if (gameState.players[id]) gameState.players[id].score += cfg.points; });
    Object.entries(gameState.votes).forEach(([voterId, targetId]) => {
      if (winners.includes(targetId) && gameState.players[voterId]) gameState.players[voterId].score += Math.floor(cfg.points / 2);
    });
    return;
  }

  ids.forEach(id => {
    const p = gameState.players[id];
    if (p.blockedThisRound) return addRoundMessage('noAnswer', { name: p.name });
    const sub = gameState.submissions[id];
    if (!sub) return addRoundMessage('noAnswer', { name: p.name });
    let correct = false;
    if (gameState.currentType === 'slider') {
      correct = Math.abs(Number(sub.answer) - Number(gameState.currentQuestion.answer)) <= 10;
    } else {
      correct = normalize(sub.answer) === normalize(gameState.currentQuestion.answer);
    }
    if (correct) {
      const elapsed = Math.max(0, cfg.time - sub.timeLeft);
      let pts = Math.max(Math.floor(cfg.points * 0.4), cfg.points - elapsed * 5);
      if (p.boostActive) pts *= 2;
      p.score += pts;
      p.stats.correct++;
      gameState.logs.push({ at: Date.now(), line: `${p.name} zdobywa ${pts} pkt.` });
    } else {
      p.stats.wrong++;
      if (p.boostActive) p.score -= Math.floor(cfg.points / 2);
      addRoundMessage('wrong', { name: p.name });
    }
  });
}

function startAuctionVerify() {
  gameState.phase = 'auction_verify';
  emitState();
}

function resolveAuction(success) {
  const bid = gameState.auction.lowestBid;
  if (bid?.socketId && gameState.players[bid.socketId]) {
    const p = gameState.players[bid.socketId];
    if (success) p.score += bid.amount;
    else p.score -= bid.amount;
  }
  startResults();
}

function startStoryGuessing() {
  const entries = Object.entries(gameState.submissions).filter(([, s]) => s.answer);
  gameState.storyPool = entries.map(([authorId, s]) => ({ authorId, text: s.answer }));
  if (!gameState.storyPool.length) return startResults();
  gameState.phase = 'story_guess';
  gameState.votes = {};
  gameState.currentStoryIndex = 0;
  emitState();
  startTimer(20, resolveCurrentStoryGuess, { endWhenAllAnswered: true });
}

function resolveCurrentStoryGuess() {
  const story = gameState.storyPool[gameState.currentStoryIndex];
  if (!story) return startResults();
  Object.entries(gameState.votes).forEach(([voterId, guessedAuthor]) => {
    if (voterId !== story.authorId && guessedAuthor === story.authorId && gameState.players[voterId]) gameState.players[voterId].score += 100;
  });
  if (gameState.players[story.authorId]) {
    const wrong = Object.values(gameState.votes).filter(v => v !== story.authorId).length;
    gameState.players[story.authorId].score += wrong * 30;
  }
  gameState.currentStoryIndex++;
  gameState.votes = {};
  if (gameState.currentStoryIndex >= gameState.storyPool.length) return startResults();
  emitState();
  startTimer(20, resolveCurrentStoryGuess, { endWhenAllAnswered: true });
}

function startDebateVoting() {
  gameState.phase = 'debate_vote';
  gameState.votes = {};
  emitState();
  startTimer(25, resolveDebateVoting, { endWhenAllAnswered: true });
}

function resolveDebateVoting() {
  Object.values(gameState.votes).forEach(targetId => {
    if (gameState.players[targetId]) gameState.players[targetId].score += categoryConfig[gameState.currentCategory].points;
  });
  startResults();
}

function startResults() {
  const sorted = Object.values(gameState.players).sort((a, b) => b.score - a.score);
  if (sorted[0]) addRoundMessage('leader', { name: sorted[0].name });
  if (sorted.length > 1) addRoundMessage('last', { name: sorted[sorted.length - 1].name });
  gameState.phase = 'results';
  emitState();
  startTimer(9, () => {
    if (gameState.roundNumber >= gameState.maxRounds) startFinal();
    else startWheel();
  });
}

function startFinal() {
  gameState.finalStarted = true;
  gameState.phase = 'final_auction';
  gameState.currentCategory = 'final';
  gameState.currentType = 'final_bid';
  gameState.currentQuestion = chooseQuestion('final');
  gameState.finalBid = { leaderId: null, amount: 0 };
  gameState.submissions = {};
  resetRoundPlayerFlags();
  emitState();
  startTimer(30, startFinalVerify);
}

function startFinalVerify() {
  gameState.phase = 'final_verify';
  emitState();
}

function resolveFinal(success) {
  const id = gameState.finalBid.leaderId;
  if (id && gameState.players[id]) {
    if (success) gameState.players[id].score += 700;
    else gameState.players[id].score = Math.floor(gameState.players[id].score / 2);
  }
  startSecretReveal();
}

function startSecretReveal() {
  gameState.phase = 'secret_agent_reveal';
  gameState.votes = {};
  emitState();
}

function resolveSecretMission(playerId, success) {
  if (gameState.players[playerId] && success) gameState.players[playerId].score += 500;
  emitState();
}

function gameOver() {
  gameState.phase = 'game_over';
  emitState();
}

function useItem(socket, payload) {
  const p = gameState.players[socket.id];
  if (!p || gameState.phase !== 'tactical') return;
  const item = payload?.item;
  const targetId = payload?.targetId;
  if (!p.inventory[item] || p.inventory[item] <= 0) return;

  if (item === 'boost') {
    p.inventory.boost--;
    p.boostActive = true;
    return emitState();
  }
  if (item === 'shield') {
    p.inventory.shield--;
    p.shieldActive = true;
    return emitState();
  }
  const target = gameState.players[targetId];
  if (!target || targetId === socket.id) return;
  p.inventory[item]--;
  p.stats.sabotagesUsed++;
  if (target.shieldActive) {
    target.shieldActive = false;
    gameState.tactical.roundMessages.push(`${target.name} odbija sabotaż tarczą. ${p.name} właśnie zmarnował sprzęt.`);
  } else if (item === 'lock') {
    target.blockedThisRound = true;
    addRoundMessage('sabotage', { from: p.name, to: target.name });
  } else if (item === 'flashbang') {
    target.flashbangThisRound = true;
    addRoundMessage('sabotage', { from: p.name, to: target.name });
  }
  emitState();
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
app.post('/api/reset', (req, res) => {
  const oldPlayers = gameState.players;
  clearTimer();
  gameState = freshGameState();
  gameState.players = oldPlayers;
  Object.values(gameState.players).forEach(p => { p.score = 0; p.inventory = defaultPlayerInventory(); p.secretMission = rand(secretMissions); });
  emitState();
  res.json({ success: true });
});

io.on('connection', socket => {
  socket.emit('updateState', publicState(socket.id));
  socket.emit('tvState', publicState(null));

  socket.on('joinGame', playerName => {
    const name = String(playerName || '').trim().slice(0, 24);
    if (!name) return;
    gameState.players[socket.id] = {
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
    emitState();
  });

  socket.on('tvStartGame', startGame);
  socket.on('adminResetGame', () => { clearTimer(); gameState = freshGameState(); emitState(); });
  socket.on('useItem', payload => useItem(socket, payload));

  socket.on('submitAnswer', answer => {
    const p = gameState.players[socket.id];
    if (!p || p.blockedThisRound) return;

    if (gameState.phase === 'round') {
      if (gameState.currentType === 'auction') {
        const amount = parseInt(answer, 10);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const current = gameState.auction.lowestBid?.amount ?? 100;
        if (amount < current) {
          gameState.auction.lowestBid = { player: p.name, amount, socketId: socket.id };
          gameState.auction.winnerSocketId = socket.id;
          io.emit('auctionUpdate', gameState.auction.lowestBid);
          emitState();
        }
        return;
      }
      if (gameState.currentType === 'final_bid') return;
      if (p.answered && gameState.currentType !== 'debate') return;
      p.answered = true;
      gameState.submissions[socket.id] = { answer, timeLeft: gameState.timer, at: Date.now() };
      emitState();
      return;
    }

    if (gameState.phase === 'story_guess' || gameState.phase === 'debate_vote') {
      gameState.votes[socket.id] = answer;
      p.answered = true;
      emitState();
    }
  });

  socket.on('submitVote', targetId => {
    if (!gameState.players[socket.id]) return;
    if (gameState.phase === 'round' && gameState.currentType === 'vote') {
      gameState.votes[socket.id] = targetId;
      gameState.players[socket.id].answered = true;
      emitState();
    }
  });

  socket.on('submitFinalBid', amount => {
    if (gameState.phase !== 'final_auction') return;
    const bid = parseInt(amount, 10);
    if (!Number.isFinite(bid) || bid <= 0) return;
    gameState.submissions[socket.id] = { answer: bid, timeLeft: gameState.timer };
    if (bid > gameState.finalBid.amount) gameState.finalBid = { leaderId: socket.id, amount: bid };
    emitState();
  });

  socket.on('tvAuctionResult', resolveAuction);
  socket.on('tvFinalResult', resolveFinal);
  socket.on('tvSecretResult', ({ playerId, success }) => resolveSecretMission(playerId, success));
  socket.on('tvGameOver', gameOver);

  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) gameState.players[socket.id].connected = false;
    emitState();
  });
});

server.listen(PORT, () => console.log(`Party Protocol działa na porcie ${PORT}`));
