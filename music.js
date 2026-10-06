/* 법조인 키우기 — 배경음악
 * 맵마다 다른 곡. 기본은 WebAudio 칩튠(코드로 작곡). assets/bgm/ 에 mp3를 넣고 BGM_FILES에 등록하면 그 파일이 대신 재생된다.
 * 예) BGM_FILES.ch1 = 'assets/bgm/bgm_ch1.mp3'  (Suno 등으로 만든 곡)
 */
'use strict';

const BGM_FILES = {
  // title: 'assets/bgm/bgm_title.mp3', town: 'assets/bgm/bgm_town.mp3', ch1: ..., ch2: ..., ch3: ..., ch4: ..., ch5: ..., boss: ..., kim: ...
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10], HARM = [0, 2, 3, 5, 7, 8, 11], PHRYG = [0, 1, 3, 5, 7, 8, 10];
// lead/counter: 8분음표 토큰 (숫자=음계 도수, '-'=이어서, '.'=쉼표), 한 마디 8개 × 4마디
// drums: 16분음표 한 마디 패턴 (k 킥, s 스네어, h 하이햇)
const SONGS = {
  title: { name: '서류폭풍 위의 형광펜', bpm: 96, root: 60, scale: MAJOR, chords: [0, 4, 5, 3], lead: '4 - 4 7 - 6 4 - 6 - 4 1 - 6 1 - 2 - 4 5 - 4 2 - 3 - 2 1 - . 0 -', leadWave: 'square', bass: 'half', pad: true, arp: '0 1 2 1', drums: { k: 'x.......x.......', s: '........x.......', h: 'x...x...x...x...' } },
  town: { name: '법조타운 산책', bpm: 112, root: 65, scale: MAJOR, chords: [0, 5, 1, 4], lead: '2 . 4 . 7 . 4 . 5 . 4 2 0 . 2 . 1 . 3 . 5 . 4 . 4 . 2 . 1 . . .', leadWave: 'triangle', bass: 'bounce', arp: '0 2 1 2', drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' } },
  ch1: { name: '기말고사 마지막 날', bpm: 128, root: 55, scale: MAJOR, chords: [0, 3, 4, 0], lead: '0 2 4 7 4 2 4 - 3 5 7 5 3 5 7 - 4 6 8 6 4 6 8 - 7 - 6 - 4 - . .', leadWave: 'square', bass: 'octave', drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
  ch2: { name: '끝나지 않는 기록', bpm: 92, root: 57, scale: MINOR, chords: [0, 5, 3, 4], lead: '7 - - 6 4 - - - 5 - - 4 2 - - - 3 - 4 5 4 - 2 - 1 - - - . . . .', leadWave: 'triangle', bass: 'half', arp: '0 1 2 1 2 1', pad: true, drums: { k: 'x...............', s: '................', h: '....x.......x...' } },
  ch3: { name: '자정의 마감 (재즈)', bpm: 104, root: 62, scale: DORIAN, chords: [0, 3, 0, 4], lead: '4 . 6 7 . 6 4 2 3 . 2 0 . . 2 3 4 . 6 7 9 7 6 4 3 2 0 - . . . .', leadWave: 'triangle', bass: 'walk', drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x..xx..xx..xx..x' } },
  ch4: { name: '폴리스라인', bpm: 136, root: 52, scale: MINOR, chords: [0, 5, 6, 4], lead: '7 7 . 7 9 . 10 . 11 . 10 9 . 7 . . 12 12 . 12 11 . 10 . 9 . 8 . 7 - - -', leadWave: 'sawtooth', bass: 'pulse', drums: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' } },
  ch5: { name: '50층으로 가는 계단', bpm: 108, root: 48, scale: HARM, chords: [0, 5, 3, 4], lead: '7 - - 6 7 - 9 - 8 - 7 - 6 - 4 - 5 - - 4 5 - 7 - 6 - - - 4 - - -', leadWave: 'square', bass: 'octave', pad: true, drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
  boss: { name: '원흉', bpm: 152, root: 52, scale: PHRYG, chords: [0, 1, 0, 6], lead: '7 8 7 . 10 8 7 . 11 . 12 11 . 10 8 . 7 8 7 . 10 11 12 . 14 . 12 . 11 . 8 .', leadWave: 'sawtooth', bass: 'pulse', drums: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' } },
  kim: { name: '지옥에서 온 변호사', bpm: 120, root: 50, scale: HARM, chords: [0, 5, 1, 4], lead: '11 - 10 9 - 10 11 - 12 - 11 - 9 - 8 - 9 - 11 14 - 13 11 - 13 - - - 11 - - -', leadWave: 'square', bass: 'octave', pad: true, arp: '0 1 2 1', drums: { k: 'x...x...x...x.x.', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' } },
};

const BGM = {
  on: true, vol: 0.5, key: null, ctx: null, out: null, timer: null, nextT: 0, step: 0, song: null, el: null, lead: null,
  ensure() {
    if (this.ctx) return true;
    SFX.init(); if (!SFX.ctx) return false;
    this.ctx = SFX.ctx; this.out = this.ctx.createGain(); this.out.gain.value = 0.16 * this.vol; this.out.connect(this.ctx.destination);
    return true;
  },
  setOn(v) { this.on = v; if (!v) this.stop(true); else if (this.key) { const k = this.key; this.key = null; this.play(k); } },
  play(key) {
    if (this.key === key && (this.timer || this.el)) return;
    this.stop(); this.key = key;
    if (!this.on || !SONGS[key] && !BGM_FILES[key]) return;
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (BGM_FILES[key]) { const a = new Audio(BGM_FILES[key]); a.loop = true; a.volume = 0.45 * this.vol; a.play().catch(() => { }); this.el = a; return; }
    this.song = SONGS[key]; this.lead = this.song.lead.split(/\s+/); this.step = 0; this.nextT = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 30);
  },
  stop(keepKey) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.el) { this.el.pause(); this.el = null; }
    if (!keepKey) this.key = null;
  },
  midi(d, base) { const s = this.song.scale; const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return base + 12 * o + s[i]; },
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  tick() {
    if (!this.ctx || document.hidden) return;
    const spb = 60 / this.song.bpm / 4; // 16분음표 길이
    while (this.nextT < this.ctx.currentTime + 0.18) { this.playStep(this.step, this.nextT, spb); this.nextT += spb; this.step = (this.step + 1) % 64; }
  },
  note(f, t, dur, wave, vol, cutoff) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = wave; o.frequency.setValueAtTime(f, t);
    let node = o;
    if (cutoff) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; o.connect(fl); node = fl; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(t, dur, vol, hp) {
    const c = this.ctx, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.connect(f).connect(g).connect(this.out); s.start(t);
  },
  kick(t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.18); },
  playStep(step, t, spb) {
    const S_ = this.song, bar = Math.floor(step / 16) % 4, s16 = step % 16;
    const chordDeg = S_.chords[bar];
    const chord = [chordDeg, chordDeg + 2, chordDeg + 4];
    // 드럼
    const dr = S_.drums; if (dr) { if (dr.k[s16] === 'x') this.kick(t); if (dr.s[s16] === 'x') { this.noise(t, 0.12, 0.35, 1500); this.note(190, t, 0.08, 'triangle', 0.15); } if (dr.h[s16] === 'x') this.noise(t, 0.03, 0.12, 7000); }
    // 베이스
    const root = this.midi(chordDeg, S_.root - 24), fifth = this.midi(chordDeg + 4, S_.root - 24);
    const b = S_.bass;
    if (b === 'half' && s16 % 8 === 0) this.note(this.hz(root), t, spb * 7, 'triangle', 0.5);
    else if (b === 'bounce' && s16 % 4 === 0) this.note(this.hz(s16 % 8 === 0 ? root : fifth), t, spb * 3, 'triangle', 0.45);
    else if (b === 'octave' && s16 % 2 === 0) this.note(this.hz(root + (s16 % 4 === 2 ? 12 : 0)), t, spb * 1.6, 'square', 0.18, 900);
    else if (b === 'pulse' && s16 % 2 === 0) this.note(this.hz(root), t, spb * 1.4, 'sawtooth', 0.2, 700);
    else if (b === 'walk' && s16 % 4 === 0) { const w = [chordDeg, chordDeg + 2, chordDeg + 4, chordDeg + 5][s16 / 4]; this.note(this.hz(this.midi(w, S_.root - 24)), t, spb * 3.5, 'triangle', 0.5); }
    // 패드
    if (S_.pad && s16 === 0) for (const d of chord) this.note(this.hz(this.midi(d, S_.root - 12)), t, spb * 15, 'sawtooth', 0.05, 1100);
    // 아르페지오
    if (S_.arp && s16 % 2 === 1) { const pat = S_.arp.split(' ').map(Number); const k = pat[Math.floor(s16 / 2) % pat.length]; this.note(this.hz(this.midi(chord[k] + 7, S_.root - 12)), t, spb * 1.8, 'triangle', 0.08); }
    // 멜로디 (8분음표)
    if (s16 % 2 === 0) {
      const idx = (bar * 8 + s16 / 2) % this.lead.length, tok = this.lead[idx];
      if (tok !== '-' && tok !== '.') {
        let len = 1; while (this.lead[(idx + len) % this.lead.length] === '-' && len < 8) len++;
        const m = this.midi(+tok, S_.root);
        this.note(this.hz(m), t, spb * 2 * len * 0.95, S_.leadWave || 'square', S_.leadWave === 'sawtooth' ? 0.07 : 0.1, S_.leadWave === 'sawtooth' ? 2200 : 0);
      }
    }
  },
  jingle(kind) {
    if (!this.on || !this.ensure()) return;
    const t = this.ctx.currentTime + 0.02; const seq = kind === 'win' ? [72, 76, 79, 84] : kind === 'job' ? [67, 72, 76, 79, 84, 88] : [64, 60, 55];
    seq.forEach((m, i) => this.note(this.hz(m), t + i * 0.11, 0.3, 'square', 0.12));
  },
};
