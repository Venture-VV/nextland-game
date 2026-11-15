#!/usr/bin/env python3
"""给 index.html 里引用的脚本和样式加版本号,并写出 version.txt。

用法:
    python3 tools/stamp.py           改完 js / css / 音乐等文件后跑一次,再提交
    python3 tools/stamp.py --check   只检查版本号是否最新,过期就以非零状态退出

为什么需要:GitHub Pages 让浏览器把每个文件缓存 10 分钟。不加版本号时,发布新版后
普通刷新只会重新取 index.html,脚本和样式还是缓存里的旧文件,新旧混在一起,看起来
就像没更新。版本号取文件内容的哈希,文件一变地址就变;没变的文件继续用缓存。

- index.html 里每个 <link href> 和 <script src> 写成 路径?v=哈希
- 由脚本运行时再去加载的文件(three.js、背景音乐)记在 window.NL_VER.files 里
- 所有这些哈希再合成一个总版本号,写进 window.NL_VER.build 和 version.txt;
  页面打开后会比对两者,发现自己是旧页面就自动重新加载一次(见 js/main.js)
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAZY = ["vendor/three.min.js", "assets/audio/bgm.mp3"]  # 不在 index.html 里、由脚本按需加载的文件
TAG = re.compile(r'(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#:]+)(?:\?v=[0-9a-f]+)?(")')
INLINE = re.compile(r"<script>window\.NL_VER=.*?</script>\n?")


def digest(path):
    with open(os.path.join(ROOT, path), "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:10]


def build():
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        html = INLINE.sub("", f.read())
    parts = []

    def stamp(m):
        h = digest(m.group(2))
        parts.append(m.group(2) + ":" + h)
        return "%s%s?v=%s%s" % (m.group(1), m.group(2), h, m.group(3))

    html = TAG.sub(stamp, html)
    lazy = {p: digest(p) for p in LAZY}
    parts += ["%s:%s" % kv for kv in sorted(lazy.items())]
    version = hashlib.sha1("\n".join(parts).encode()).hexdigest()[:10]
    files = ",".join("'%s':'%s'" % kv for kv in sorted(lazy.items()))
    inline = "<script>window.NL_VER={build:'%s',files:{%s}};</script>\n" % (version, files)
    marker = '<script src="js/core.js'
    assert marker in html, "index.html 里找不到 core.js 的引用"
    html = html.replace(marker, inline + marker, 1)
    return html, version + "\n"


def main():
    html, version = build()
    targets = {"index.html": html, "version.txt": version}
    stale = []
    for name, want in targets.items():
        path = os.path.join(ROOT, name)
        have = open(path, encoding="utf-8").read() if os.path.exists(path) else None
        if have != want:
            stale.append(name)
            if "--check" not in sys.argv:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(want)
    if "--check" in sys.argv:
        if stale:
            print("版本号过期:%s。请先运行 python3 tools/stamp.py" % "、".join(stale))
            sys.exit(1)
        print("版本号是最新的:", version.strip())
    else:
        print("版本号", version.strip(), "| 更新了:", "、".join(stale) if stale else "无")


if __name__ == "__main__":
    main()
