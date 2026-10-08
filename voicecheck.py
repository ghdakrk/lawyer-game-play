# 후보 영상의 대사 연기 비교: 받아쓰기(단어 시각) · 목소리 높낮이 폭 · 크기 변화 · 말 속도
import sys, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
def pcm(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768
def f0_track(x, sr=16000, hop=160, win=640):
    out = []
    for i in range(0, len(x) - win, hop):
        fr = x[i:i + win] * np.hanning(win)
        if np.sqrt(np.mean(fr ** 2)) < 0.02: continue
        ac = np.correlate(fr, fr, 'full')[win - 1:]
        lo, hi = sr // 500, sr // 80          # 80~500 Hz
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] / (ac[0] + 1e-9) > 0.35: out.append(sr / k)
    return np.array(out)
for f in sys.argv[1:]:
    segs, _ = m.transcribe(f, language="ko", word_timestamps=True)
    words = [(round(w.start, 2), round(w.end, 2), w.word.strip()) for s in segs for w in s.words]
    x = pcm(f); f0 = f0_track(x)
    rms = np.array([np.sqrt(np.mean(x[i:i + 800] ** 2)) for i in range(0, len(x) - 800, 800)]); db = 20 * np.log10(rms + 1e-6); voiced = db[db > -35]
    span = (words[-1][1] - words[0][0]) if words else 0
    syl = sum(len(w[2].replace('?', '').replace('!', '').replace('.', '')) for w in words)
    print(f"== {f}\n  words: {words}")
    if len(f0): print(f"  pitch median {np.median(f0):.0f}Hz  range(10-90%) {np.percentile(f0,10):.0f}-{np.percentile(f0,90):.0f}Hz  semitone spread {12*np.log2(np.percentile(f0,90)/np.percentile(f0,10)):.1f}")
    print(f"  loudness spread {np.std(voiced):.1f} dB  peak {db.max():.1f} dB  speech rate {syl/span if span else 0:.1f} syl/s")
