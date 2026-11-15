"""美术后期用到的两个现成模型,第一次用时从 Hugging Face 下载到 .work/models/(不进仓库)。

- 放大:CDC 的二次元 4 倍放大模型(deepghs/cdc_anime_onnx)
- 抠人物:anime-seg 的 isnetis(skytnt/anime-seg),给出人物的透明度蒙版

都用 onnxruntime 在 CPU 上跑,不需要显卡。
"""
import os

import numpy as np
import onnxruntime as ort
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".work", "models")
_sessions = {}


def _session(repo, name):
    key = repo + "/" + name
    if key not in _sessions:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download(repo, name, cache_dir=CACHE)
        opt = ort.SessionOptions()
        opt.intra_op_num_threads = os.cpu_count() or 4
        _sessions[key] = ort.InferenceSession(path, opt, providers=["CPUExecutionProvider"])
    return _sessions[key]


def upscale4x(im, tile=192, pad=16, log=None):
    """把图放大 4 倍。分块推理,每块四周多带 pad 像素再裁掉,接缝就看不出来。"""
    sess = _session("deepghs/cdc_anime_onnx", "HGSR-MHR-anime-aug_X4_320.onnx")
    name = sess.get_inputs()[0].name
    a = np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0
    h, w, _ = a.shape
    out = np.zeros((h * 4, w * 4, 3), dtype=np.float32)
    ys, xs = list(range(0, h, tile)), list(range(0, w, tile))
    n = 0
    for y in ys:
        for x in xs:
            y0, x0, y1, x1 = max(0, y - pad), max(0, x - pad), min(h, y + tile + pad), min(w, x + tile + pad)
            t = a[y0:y1, x0:x1].transpose(2, 0, 1)[None]
            r = sess.run(None, {name: t})[0][0]  # 模型报的形状是 (3, 4, 高, 4, 宽),其实就是放大后的图,直接摊平成 (3, 4×高, 4×宽)
            r = r.reshape(3, r.shape[2] * 4, r.shape[4] * 4).transpose(1, 2, 0)
            oy, ox = (y - y0) * 4, (x - x0) * 4
            th, tw = (min(h, y + tile) - y) * 4, (min(w, x + tile) - x) * 4
            out[y * 4:y * 4 + th, x * 4:x * 4 + tw] = r[oy:oy + th, ox:ox + tw]
            n += 1
            if log and n % 6 == 0:
                log("  放大 %d/%d 块" % (n, len(ys) * len(xs)))
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))


def character_matte(im, size=1024):
    """返回人物的蒙版(0~255,和原图同尺寸)。"""
    sess = _session("skytnt/anime-seg", "isnetis.onnx")
    name = sess.get_inputs()[0].name
    w, h = im.size
    k = size / max(w, h)
    nw, nh = round(w * k), round(h * k)
    canvas = np.zeros((size, size, 3), dtype=np.float32)
    ox, oy = (size - nw) // 2, (size - nh) // 2
    canvas[oy:oy + nh, ox:ox + nw] = np.asarray(im.convert("RGB").resize((nw, nh), Image.LANCZOS), dtype=np.float32) / 255.0
    m = sess.run(None, {name: canvas.transpose(2, 0, 1)[None]})[0][0][0]
    m = (np.clip(m[oy:oy + nh, ox:ox + nw], 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(m).resize((w, h), Image.LANCZOS)
