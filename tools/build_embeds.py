#!/usr/bin/env python3
"""把 3D 战斗要用的两张头像和战斗音乐写进 js/embed.js(base64)。

用法:
    python3 tools/build_embeds.py [--work 临时目录]

为什么要内嵌:双击 index.html 打开时页面是 file:// 协议,浏览器不允许把本地图片当作
WebGL 贴图,也不允许用 fetch 读本地音频来做精确循环。写成 data: 地址就没有这个限制。
先跑 extract_assets.py 和 build_audio.py,再跑这个脚本。
"""
import argparse
import base64
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def data_url(path, mime):
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode("ascii"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=os.path.join(ROOT, ".work"))
    a = ap.parse_args()
    items = [
        ("avatarMe", os.path.join(ROOT, "assets", "img", "battle", "me.jpg"), "image/jpeg"),
        ("avatarFoe", os.path.join(ROOT, "assets", "img", "battle", "enemy.jpg"), "image/jpeg"),
        ("battleMusic", os.path.join(a.work, "battle.mp3"), "audio/mpeg"),
    ]
    out = ["/* 由 tools/build_embeds.py 生成,不要手改。3D 战斗用的头像贴图和战斗音乐。 */", "NL.embed = {"]
    for key, path, mime in items:
        out.append("  %s: '%s'," % (key, data_url(path, mime)))
    out.append("};")
    dst = os.path.join(ROOT, "js", "embed.js")
    with open(dst, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print("written", dst, os.path.getsize(dst), "bytes")


if __name__ == "__main__":
    main()
