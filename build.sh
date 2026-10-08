#!/bin/bash
# 광고 최종 편집 (힉스필드 샌드박스): 드라마 4컷 + 게임 구간 + 엔딩 카드 → 1080×1920 30fps
# 사용: build.sh <s1url> <s2url> <s3url> <s5url> <업로드 URL>
set -e
B=https://raw.githubusercontent.com/ghdakrk/lawyer-game-play/ad-assets
mkdir -p job && cd job
for f in game.sh logo.png tag.png sub1.png sub1b.png sub2.png sub3.png sub5.png g1.png g4.png g5.png g6.png g7.png g8.png end.png; do curl -sSf -o $f $B/$f; done
for f in a_jobchange e_pros c2_ult f_justice d_kim g_kakha; do curl -sSf -o g_$f.mp4 $B/$f.mp4; done
for f in bgm_boss bgm_title; do curl -sSf -o g_$f.m4a $B/$f.m4a; done
curl -sSf -o s1.mp4 "$1"; curl -sSf -o s2.mp4 "$2"; curl -sSf -o s3.mp4 "$3"; curl -sSf -o s5.mp4 "$4"
chmod +x game.sh && ./game.sh
# 대사 시작 시각 (단어 단위)
python3 - <<'PY' > times.env
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
def words(f):
    segs, _ = m.transcribe(f, language="ko", word_timestamps=True)
    return [w for s in segs for w in s.words]
w1 = words("s1.mp4"); w5 = words("s5.mp4"); w2 = words("s2.mp4")
sw = next((w.start for w in w1 if "로스쿨" in w.word), None)
print(f"S1_START={max(0, w1[0].start - 0.1) if w1 else 0.3:.2f}")
print(f"S1_SWITCH={sw if sw else 2.6:.2f}")
print(f"S1_END={(w1[-1].end + 0.5) if w1 else 5.5:.2f}")
print(f"S2_START={max(0, w2[0].start - 0.1) if w2 else 0.4:.2f}")
print(f"S5_START={max(0, w5[0].start - 0.1) if w5 else 0.8:.2f}")
print(f"S5_END={(w5[-1].end + 0.8) if w5 else 5.6:.2f}")
import sys; print("#", [(round(w.start,2), w.word) for w in w1], [(round(w.start,2), w.word) for w in w5], file=sys.stderr)
PY
cat times.env; . ./times.env
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30"
AUD="aresample=48000,aformat=channel_layouts=stereo"
dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 $1; }
min() { python3 -c "print(min($1,$2))"; }
L1=$(min $S1_END $(dur s1.mp4)); L5=$(min $S5_END $(dur s5.mp4))
ffmpeg -v error -y -t $L1 -i s1.mp4 -i logo.png -i sub1.png -i sub1b.png -filter_complex "[0:v]fps=30,scale=1080:1920,setsar=1[b];[b][1:v]overlay[v1];[v1][2:v]overlay=enable='between(t,$S1_START,$S1_SWITCH)'[v2];[v2][3:v]overlay=enable='gte(t,$S1_SWITCH)'[v];[0:a]$AUD[a]" -map "[v]" -map "[a]" $ENC -c:a aac -b:a 192k seg1.mp4
ffmpeg -v error -y -t 4.9 -i s2.mp4 -i logo.png -i sub2.png -filter_complex "[0:v]fps=30,scale=1080:1920,setsar=1[b];[b][1:v]overlay[v1];[v1][2:v]overlay=enable='gte(t,$S2_START)'[v];[0:a]$AUD[a]" -map "[v]" -map "[a]" $ENC -c:a aac -b:a 192k seg2.mp4
S3_LEN=${S3_LEN:-3.3}; S3_SUB=${S3_SUB:-2.15}; S3_FADE=$(python3 -c "print($S3_LEN-0.18)")
ffmpeg -v error -y -t $S3_LEN -i s3.mp4 -i logo.png -i sub3.png -filter_complex "[0:v]fps=30,scale=1080:1920,setsar=1[b];[b][1:v]overlay[v1];[v1][2:v]overlay=enable='gte(t,$S3_SUB)',fade=t=out:st=$S3_FADE:d=0.18:color=white[v];[0:a]$AUD,afade=t=out:st=$S3_FADE:d=0.2[a]" -map "[v]" -map "[a]" $ENC -c:a aac -b:a 192k seg3.mp4
ffmpeg -v error -y -t $L5 -i s5.mp4 -i logo.png -i sub5.png -filter_complex "[0:v]fps=30,scale=1080:1920,setsar=1[b];[b][1:v]overlay[v1];[v1][2:v]overlay=enable='gte(t,$S5_START)'[v];[0:a]$AUD[a]" -map "[v]" -map "[a]" $ENC -c:a aac -b:a 192k seg5.mp4
printf "file 'seg1.mp4'\nfile 'seg2.mp4'\nfile 'seg3.mp4'\nfile 'seg4.mp4'\nfile 'seg5.mp4'\nfile 'seg6.mp4'\n" > all.txt
ffmpeg -v error -y -f concat -safe 0 -i all.txt -c copy raw.mp4
ffmpeg -v error -y -i raw.mp4 -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11,$AUD" -c:a aac -b:a 192k -movflags +faststart ad.mp4
for f in seg1 seg2 seg3 seg4 seg5 seg6 ad; do echo "$f $(dur $f.mp4)"; done
ffmpeg -v error -y -i ad.mp4 -vf "fps=1/2,scale=150:266,tile=9x2" -frames:v 1 contact.jpg
if [ -n "$5" ]; then curl -sSf -X PUT -H "Content-Type: video/mp4" -H "If-None-Match: *" --upload-file ad.mp4 "$5" -o /dev/null -w "UPLOAD %{http_code}\n"; fi
