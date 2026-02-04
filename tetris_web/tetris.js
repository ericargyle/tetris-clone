(() => {
  // Simple mobile-friendly Tetris.
  // Board: 10x20. 7-bag. Hold. Ghost. Basic wall kicks.

  const W = 10, H = 20;
  const COLORS = {
    I: '#50e3e6',
    O: '#f5d35c',
    T: '#a871ff',
    S: '#69eb78',
    Z: '#eb5a5a',
    J: '#5c91ff',
    L: '#ffa550'
  };

  const SHAPES = {
    I: [
      [0,0,0,0],
      [1,1,1,1],
      [0,0,0,0],
      [0,0,0,0],
    ],
    O: [
      [0,1,1,0],
      [0,1,1,0],
      [0,0,0,0],
      [0,0,0,0],
    ],
    T: [
      [0,1,0,0],
      [1,1,1,0],
      [0,0,0,0],
      [0,0,0,0],
    ],
    S: [
      [0,1,1,0],
      [1,1,0,0],
      [0,0,0,0],
      [0,0,0,0],
    ],
    Z: [
      [1,1,0,0],
      [0,1,1,0],
      [0,0,0,0],
      [0,0,0,0],
    ],
    J: [
      [1,0,0,0],
      [1,1,1,0],
      [0,0,0,0],
      [0,0,0,0],
    ],
    L: [
      [0,0,1,0],
      [1,1,1,0],
      [0,0,0,0],
      [0,0,0,0],
    ],
  };

  const game = document.getElementById('game');
  const ctx = game.getContext('2d');
  const nextC = document.getElementById('next');
  const holdC = document.getElementById('hold');
  const nextCtx = nextC.getContext('2d');
  const holdCtx = holdC.getContext('2d');

  const elScore = document.getElementById('score');
  const elLines = document.getElementById('lines');
  const elLevel = document.getElementById('level');

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg = document.getElementById('overlayMsg');
  const overlayResume = document.getElementById('overlayResume');
  const overlayRestart = document.getElementById('overlayRestart');

  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnRotate = document.getElementById('btnRotate');
  const btnDown = document.getElementById('btnDown');
  const btnDrop = document.getElementById('btnDrop');
  const btnHold = document.getElementById('btnHold');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');

  const btnSfx = document.getElementById('btnSfx');
  const sfxState = document.getElementById('sfxState');

  // --- Sound effects (WebAudio, no asset files required) ---
  const SFX_KEY = 'tetris_web:sfx';
  let sfxEnabled = (localStorage.getItem(SFX_KEY) ?? 'on') !== 'off';

  let audioCtx = null;
  const ensureAudio = async () => {
    if(!sfxEnabled) return null;
    if(!audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if(audioCtx.state === 'suspended') await audioCtx.resume();
    return audioCtx;
  };

  function uiSfx(){
    btnSfx?.setAttribute('aria-pressed', sfxEnabled ? 'true' : 'false');
    if(sfxState) sfxState.textContent = sfxEnabled ? 'On' : 'Off';
  }
  uiSfx();

  btnSfx?.addEventListener('click', async () => {
    sfxEnabled = !sfxEnabled;
    localStorage.setItem(SFX_KEY, sfxEnabled ? 'on' : 'off');
    uiSfx();
    if(sfxEnabled) await ensureAudio();
  });

  function playPlace(){
    if(!sfxEnabled) return;
    ensureAudio().then((ac)=>{
      if(!ac) return;
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(g).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  function playKaboom(){
    if(!sfxEnabled) return;
    ensureAudio().then((ac)=>{
      if(!ac) return;
      const t = ac.currentTime;

      // Noise burst
      const duration = 0.35;
      const bufferSize = Math.floor(ac.sampleRate * duration);
      const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<bufferSize;i++){
        const decay = 1 - i/bufferSize;
        data[i] = (Math.random()*2 - 1) * Math.pow(decay, 2);
      }
      const noise = ac.createBufferSource();
      noise.buffer = buffer;

      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + duration);

      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      // Sub thump
      const osc = ac.createOscillator();
      const og = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.6, t + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      noise.connect(filter).connect(g).connect(ac.destination);
      osc.connect(og).connect(ac.destination);

      noise.start(t);
      noise.stop(t + duration);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  function rotateCW(m){
    const out = Array.from({length:4}, () => Array(4).fill(0));
    for(let r=0;r<4;r++) for(let c=0;c<4;c++) out[c][3-r] = m[r][c];
    return out;
  }
  function rotateCCW(m){
    const out = Array.from({length:4}, () => Array(4).fill(0));
    for(let r=0;r<4;r++) for(let c=0;c<4;c++) out[3-c][r] = m[r][c];
    return out;
  }

  function cloneMat(m){ return m.map(r => r.slice()); }

  class Bag {
    constructor(){ this.bag = []; }
    next(){
      if(this.bag.length === 0){
        this.bag = Object.keys(SHAPES);
        for(let i=this.bag.length-1;i>0;i--){
          const j = (Math.random()*(i+1))|0;
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      return this.bag.pop();
    }
  }

  function newPiece(kind){
    return { kind, mat: cloneMat(SHAPES[kind]), x: (W>>1)-2, y: 0 };
  }

  function cells(mat){
    const out=[];
    for(let r=0;r<4;r++) for(let c=0;c<4;c++) if(mat[r][c]) out.push([r,c]);
    return out;
  }

  function collides(board, p){
    for(const [r,c] of cells(p.mat)){
      const x=p.x+c, y=p.y+r;
      if(x<0||x>=W||y<0||y>=H) return true;
      if(board[y][x]) return true;
    }
    return false;
  }

  function lock(board, p){
    for(const [r,c] of cells(p.mat)){
      const x=p.x+c, y=p.y+r;
      if(y>=0 && y<H && x>=0 && x<W) board[y][x]=p.kind;
    }
  }

  function clearLines(board){
    const kept = board.filter(row => row.some(cell => !cell));
    const cleared = H - kept.length;
    while(kept.length < H) kept.unshift(Array(W).fill(null));
    for(let i=0;i<H;i++) board[i]=kept[i];
    return cleared;
  }

  function ghostY(board, p){
    const tmp = {kind:p.kind, mat:cloneMat(p.mat), x:p.x, y:p.y};
    while(true){
      tmp.y++;
      if(collides(board,tmp)) return tmp.y-1;
    }
  }

  let state;
  function reset(){
    const board = Array.from({length:H}, ()=>Array(W).fill(null));
    const bag = new Bag();
    const cur = newPiece(bag.next());
    state = {
      board,
      bag,
      cur,
      next: bag.next(),
      hold: null,
      holdUsed: false,
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false,
      paused: false,
      fallTimer: 0,
      lockTimer: 0,
      fallInterval: 0.8,
      lockDelay: 0.5,
    };
    updateHUD();
    hideOverlay();
  }

  function updateLevel(){
    state.level = 1 + Math.floor(state.lines/10);
    state.fallInterval = Math.max(0.08, 0.8 * Math.pow(0.86, state.level-1));
  }

  function updateHUD(){
    elScore.textContent = String(state.score);
    elLines.textContent = String(state.lines);
    elLevel.textContent = String(state.level);
  }

  function showOverlay(title, msg){
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg || '';
    overlay.classList.remove('hidden');
  }
  function hideOverlay(){ overlay.classList.add('hidden'); }

  function spawnNext(){
    state.cur = newPiece(state.next);
    state.next = state.bag.next();
    state.holdUsed = false;
    state.lockTimer = 0;
    if(collides(state.board, state.cur)){
      state.gameOver = true;
      showOverlay('Game Over', 'Press Restart to play again.');
    }
  }

  function lockNow(){
    lock(state.board, state.cur);
    playPlace();

    const cleared = clearLines(state.board);
    if(cleared){
      const pts = {1:100,2:300,3:500,4:800}[cleared] || 0;
      state.score += pts * state.level;
      state.lines += cleared;
      updateLevel();
      if(cleared === 4) playKaboom();
    }
    spawnNext();
    updateHUD();
  }

  function tryMove(dx,dy){
    const p = state.cur;
    p.x += dx; p.y += dy;
    if(collides(state.board,p)){
      p.x -= dx; p.y -= dy;
      return false;
    }
    return true;
  }

  function tryRotate(dir){
    const p = state.cur;
    const old = cloneMat(p.mat);
    p.mat = dir==='cw' ? rotateCW(p.mat) : rotateCCW(p.mat);
    const kicks = [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]];
    for(const [kx,ky] of kicks){
      p.x += kx; p.y += ky;
      if(!collides(state.board,p)) return true;
      p.x -= kx; p.y -= ky;
    }
    p.mat = old;
    return false;
  }

  function hardDrop(){
    const gy = ghostY(state.board, state.cur);
    const drop = gy - state.cur.y;
    if(drop>0) state.score += 2*drop;
    state.cur.y = gy;
    lockNow();
  }

  function doHold(){
    if(state.holdUsed || state.gameOver) return;
    state.holdUsed = true;
    const curKind = state.cur.kind;
    if(!state.hold){
      state.hold = curKind;
      state.cur = newPiece(state.next);
      state.next = state.bag.next();
    } else {
      state.cur = newPiece(state.hold);
      state.hold = curKind;
    }
    if(collides(state.board, state.cur)){
      state.gameOver = true;
      showOverlay('Game Over', '');
    }
  }

  // Rendering
  function sizeCanvas(){
    // Fit board into viewport nicely on mobile.
    const maxW = Math.min(window.innerWidth - 28, 360);
    const cell = Math.floor(maxW / W);
    const bw = cell * W;
    const bh = cell * H;
    game.width = bw;
    game.height = bh;
    game.style.width = bw + 'px';
    game.style.height = bh + 'px';
    state.cell = cell;
  }

  function drawBoard(){
    const cell = state.cell || 30;
    ctx.clearRect(0,0,game.width,game.height);

    // background grid
    ctx.fillStyle = '#161a22';
    ctx.fillRect(0,0,game.width,game.height);

    ctx.strokeStyle = '#2a3142';
    ctx.lineWidth = 1;
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        ctx.strokeRect(x*cell+0.5, y*cell+0.5, cell, cell);
        const k = state.board[y][x];
        if(k){
          ctx.fillStyle = COLORS[k];
          ctx.fillRect(x*cell, y*cell, cell, cell);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.strokeRect(x*cell+0.5,y*cell+0.5,cell-1,cell-1);
          ctx.strokeStyle = '#2a3142';
        }
      }
    }

    if(!state.gameOver){
      // ghost
      const gy = ghostY(state.board, state.cur);
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = COLORS[state.cur.kind];
      for(const [r,c] of cells(state.cur.mat)){
        const x = (state.cur.x+c)*cell;
        const y = (gy+r)*cell;
        ctx.fillRect(x,y,cell,cell);
      }
      ctx.restore();

      // piece
      ctx.fillStyle = COLORS[state.cur.kind];
      for(const [r,c] of cells(state.cur.mat)){
        const x = (state.cur.x+c)*cell;
        const y = (state.cur.y+r)*cell;
        if(y>=0){
          ctx.fillRect(x,y,cell,cell);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.strokeRect(x+0.5,y+0.5,cell-1,cell-1);
        }
      }
      ctx.strokeStyle = '#2a3142';
    }
  }

  function drawMini(ctx2, kind){
    ctx2.clearRect(0,0,120,120);
    if(!kind) return;
    const mat = SHAPES[kind];
    const cell = 20;
    const ox = 10, oy = 16;
    ctx2.fillStyle = COLORS[kind];
    ctx2.strokeStyle = 'rgba(0,0,0,0.25)';
    for(let r=0;r<4;r++){
      for(let c=0;c<4;c++){
        if(mat[r][c]){
          const x=ox+c*cell, y=oy+r*cell;
          ctx2.fillRect(x,y,cell,cell);
          ctx2.strokeRect(x+0.5,y+0.5,cell-1,cell-1);
        }
      }
    }
  }

  // Game loop
  let last = performance.now();
  function tick(now){
    const dt = (now - last) / 1000;
    last = now;

    if(!state.paused && !state.gameOver){
      state.fallTimer += dt;
      if(state.fallTimer >= state.fallInterval){
        state.fallTimer = 0;
        const moved = tryMove(0,1);
        if(!moved) state.lockTimer += state.fallInterval;
      }

      // lock delay when resting
      const p = state.cur;
      const test = {kind:p.kind, mat:cloneMat(p.mat), x:p.x, y:p.y+1};
      if(collides(state.board,test)){
        state.lockTimer += dt;
        if(state.lockTimer >= state.lockDelay) lockNow();
      } else {
        state.lockTimer = 0;
      }
    }

    drawBoard();
    drawMini(nextCtx, state.next);
    drawMini(holdCtx, state.hold);

    requestAnimationFrame(tick);
  }

  // Inputs
  function act(fn){
    if(state.gameOver) return;
    if(state.paused) return;
    fn();
    drawBoard();
    drawMini(nextCtx, state.next);
    drawMini(holdCtx, state.hold);
    updateHUD();
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'p'){ state.paused = !state.paused; state.paused ? showOverlay('Paused','') : hideOverlay(); return; }
    if(k === 'r'){ reset(); return; }
    if(state.paused || state.gameOver) return;

    if(e.key === 'ArrowLeft') act(()=>tryMove(-1,0));
    else if(e.key === 'ArrowRight') act(()=>tryMove(1,0));
    else if(e.key === 'ArrowDown') act(()=>{ if(tryMove(0,1)) state.score += 1; });
    else if(e.key === 'ArrowUp' || k==='x') act(()=>tryRotate('cw'));
    else if(k==='z') act(()=>tryRotate('ccw'));
    else if(e.key === ' ') { e.preventDefault(); act(()=>hardDrop()); }
    else if(k==='c') act(()=>doHold());
  }, {passive:false});

  // Buttons (touch/mouse)
  function bindBtn(btn, fn){
    const handler = (e) => { e.preventDefault(); act(fn); };
    btn.addEventListener('pointerdown', handler);
  }

  bindBtn(btnLeft, ()=>tryMove(-1,0));
  bindBtn(btnRight, ()=>tryMove(1,0));
  bindBtn(btnRotate, ()=>tryRotate('cw'));
  bindBtn(btnDown, ()=>{ if(tryMove(0,1)) state.score += 1; });
  bindBtn(btnDrop, ()=>hardDrop());
  bindBtn(btnHold, ()=>doHold());

  btnPause.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    state.paused = !state.paused;
    state.paused ? showOverlay('Paused','') : hideOverlay();
  });
  btnRestart.addEventListener('pointerdown', (e)=>{ e.preventDefault(); reset(); });

  overlayResume.addEventListener('click', ()=>{ state.paused=false; hideOverlay(); });
  overlayRestart.addEventListener('click', ()=>{ reset(); });

  // Board gestures
  let touchStart = null;
  game.addEventListener('pointerdown', (e) => {
    game.setPointerCapture(e.pointerId);
    touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  game.addEventListener('pointerup', (e) => {
    if(!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    const swipeMin = 26;
    // Swipe
    if(adx > swipeMin || ady > swipeMin){
      if(ady > adx){
        if(dy > 0) act(()=>{ if(tryMove(0,1)) state.score += 1; });
        else act(()=>hardDrop());
      } else {
        if(dx > 0) act(()=>tryMove(1,0));
        else act(()=>tryMove(-1,0));
      }
    } else {
      // Tap: left third/right third moves, middle rotates
      const rect = game.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;
      if(x < third) act(()=>tryMove(-1,0));
      else if(x > 2*third) act(()=>tryMove(1,0));
      else act(()=>tryRotate('cw'));
    }
    touchStart = null;
  });

  // Prevent page scroll while interacting with board
  game.addEventListener('touchmove', (e) => e.preventDefault(), {passive:false});

  // Boot
  reset();
  sizeCanvas();
  window.addEventListener('resize', () => { sizeCanvas(); });
  requestAnimationFrame(tick);
})();
