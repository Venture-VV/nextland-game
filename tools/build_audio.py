#!/usr/bin/env python3
"""从录屏的音轨里取出背景音乐和战斗音乐。

用法:
    python3 tools/build_audio.py [录屏路径] [--work 临时目录]

产物:
    assets/audio/bgm.mp3    主背景音乐,正好一个循环(约 168 秒),可首尾相接
    .work/battle.mp3        战斗音乐的开头 8.7 秒,由 build_embeds.py 写进 js/embed.js

音轨的结构(录屏时间,秒):
    7.0   音乐从头开始,每 168.365 秒(7424912 个采样)循环一次,循环末尾自带渐弱到无声
    216.8 小程序被切到后台,音乐暂停;222.9 回来后从暂停处接着放
    269.1 第一场战斗:背景音乐暂停,战斗音乐从头播放;276.8 战斗结束,背景音乐从暂停处接着放
    329.1 第二场战斗,同上;337.9 结束
两场战斗的录音对齐后相关度 0.993,说明战斗里没有别的音效,就是一首固定的曲子:
65 拍/分(每拍 0.923 秒),重拍落在每拍开头。录屏里没有拍到更长的战斗,所以只有 8.7 秒,
网页里把第 2~9 拍(8 拍)首尾相接循环播放。
背景音乐取第一遍(7.0~175.4 秒),这一段没有被打断过。左右声道完全相同,所以存成单声道。
"""
import argparse
import glob
import os
import subprocess
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
LOOP_LEN = 7424912        # 背景音乐一个循环的采样数
PASS2_ONSET = 7733647     # 第二遍开头第一个响的采样
LOOP_END = PASS2_ONSET - 2205   # 往前 50 毫秒,落在循环末尾的无声处,从这里切最干净
BATTLE_START = 14514070 - 441   # 第二场战斗音乐的第一个采样,往前留 10 毫秒
BATTLE_LEN = int(8.74 * SR)


def write_wav(path, samples):
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(samples.tobytes())


def to_mp3(wav, out, kbps):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "%dk" % kbps,
                    "-ac", "1", "-map_metadata", "-1", out], check=True)


def fade(samples, n=220):
    """两头各 5 毫秒淡入淡出,免得切口有爆音。"""
    s = samples.astype(np.float32)
    ramp = np.linspace(0, 1, n, dtype=np.float32)
    s[:n] *= ramp
    s[-n:] *= ramp[::-1]
    return s.astype(np.int16)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", nargs="?", default=None)
    ap.add_argument("--work", default=os.path.join(ROOT, ".work"))
    a = ap.parse_args()
    video = a.video or sorted(glob.glob(os.path.join(ROOT, "videos", "*.mov")))[0]
    os.makedirs(a.work, exist_ok=True)
    full = os.path.join(a.work, "audio_full.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vn", "-ac", "1", "-ar", str(SR), full], check=True)
    with wave.open(full) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)

    bgm = x[LOOP_END - LOOP_LEN:LOOP_END]
    tmp = os.path.join(a.work, "bgm.wav")
    write_wav(tmp, fade(bgm))
    to_mp3(tmp, os.path.join(ROOT, "assets", "audio", "bgm.mp3"), 96)

    battle = x[BATTLE_START:BATTLE_START + BATTLE_LEN]
    tmp = os.path.join(a.work, "battle.wav")
    write_wav(tmp, fade(battle))
    to_mp3(tmp, os.path.join(a.work, "battle.mp3"), 96)
    print("bgm %.3f 秒, battle %.3f 秒" % (len(bgm) / SR, len(battle) / SR))


if __name__ == "__main__":
    main()
