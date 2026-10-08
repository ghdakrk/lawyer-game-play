#!/bin/bash
# 게임 구간: 흐린 배경 + 가운데 실제 게임 화면 + 위아래 자막. 4컷을 이어 붙이고 게임 배경음악
set -e
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30"
cut() { # $1 입력 $2 시작 $3 길이 $4 자막png $5 출력 $6 앞 흰빛(1이면)
  local fin=""; [ "$6" = "1" ] && fin=",fade=t=in:st=0:d=0.18:color=white"
  ffmpeg -v error -y -ss $2 -t $3 -i $1 -i $4 -i tag.png -i logo.png -filter_complex "
    [0:v]split[a][b];
    [a]scale=-2:1920,crop=1080:1920,boxblur=24:2,eq=brightness=-0.28:saturation=1.2[bg];
    [b]scale=1080:608:flags=lanczos[fg];
    [bg][fg]overlay=0:656[v1];[v1][1:v]overlay=0:0[v2];[v2][2:v]overlay=0:0[v3];[v3][3:v]overlay=0:0,setsar=1${fin}[v]" -map "[v]" -an $ENC $5
}
cut g_a_jobchange.mp4 0.0 2.4 g1.png c1.mp4 1
cut g_b_hunt.mp4      0.5 2.6 g2.png c2.mp4
cut g_c_ult.mp4       0.0 1.7 g3.png c3.mp4
cut g_d_kim.mp4       0.1 3.6 g4.png c4.mp4
printf "file 'c1.mp4'\nfile 'c2.mp4'\nfile 'c3.mp4'\nfile 'c4.mp4'\n" > cl.txt
ffmpeg -v error -y -f concat -safe 0 -i cl.txt -c copy cv.mp4
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 cv.mp4)
ffmpeg -v error -y -i cv.mp4 -i g_bgm_boss.m4a -filter_complex "[1:a]atrim=0:$D,afade=t=out:st=$(echo "$D-0.4" | bc):d=0.4,volume=2.2,aresample=48000,aformat=channel_layouts=stereo[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 seg4.mp4
# 엔딩 카드: 천천히 확대 + 타이틀 곡
ffmpeg -v error -y -loop 1 -t 3.4 -i end.png -i g_bgm_title.m4a -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(1+0.0009*on,1.09)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,fade=t=in:st=0:d=0.25,setsar=1[v];[1:a]atrim=0:3.4,afade=t=in:d=0.2,afade=t=out:st=2.8:d=0.6,volume=2.2,aresample=48000,aformat=channel_layouts=stereo[a]" -map "[v]" -map "[a]" $ENC -c:a aac -b:a 192k -ar 48000 seg6.mp4
for f in seg4.mp4 seg6.mp4; do ffprobe -v error -show_entries format=duration -of csv=p=0 $f; done
