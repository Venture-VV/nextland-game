#!/usr/bin/env python3
"""用 Cloudflare Workers AI 的 FLUX.2 出图,可以带参考图(同一个角色换姿势、换表情时用)。

    python3 tools/cf_image.py <输出文件> <宽> <高> "<提示词>" [参考图 ...]

账号 ID 从环境变量 CF_ACCOUNT_ID 读,没有就读 .work/art/cf_account(这个文件不进仓库)。
令牌不在这里:在 Claude 的云端环境里,它存成了 api.cloudflare.com 的网络密钥,由代理自动带上;
在自己的电脑上跑,就设环境变量 CF_API_TOKEN。
模型默认 @cf/black-forest-labs/flux-2-klein-4b,用 CF_MODEL 可以换。返回的是 JPEG。
"""
import base64
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if len(sys.argv) < 5:
        sys.exit(__doc__)
    out, w, h, prompt, refs = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:]
    acct = os.environ.get("CF_ACCOUNT_ID")
    if not acct:
        acct = open(os.path.join(ROOT, ".work", "art", "cf_account")).read().strip()
    model = os.environ.get("CF_MODEL", "@cf/black-forest-labs/flux-2-klein-4b")
    cmd = ["curl", "-sS", "-m", "180", "https://api.cloudflare.com/client/v4/accounts/%s/ai/run/%s" % (acct, model),
           "-F", "prompt=" + prompt, "-F", "width=" + w, "-F", "height=" + h]
    if os.environ.get("CF_API_TOKEN"):
        cmd += ["-H", "Authorization: Bearer " + os.environ["CF_API_TOKEN"]]
    for i, r in enumerate(refs):
        cmd += ["-F", "input_image_%d=@%s" % (i, r)]
    raw = subprocess.run(cmd, capture_output=True).stdout
    try:
        d = json.loads(raw)
    except ValueError:
        sys.exit("返回的不是 JSON: %r" % raw[:200])
    if not d.get("success"):
        sys.exit("失败: " + json.dumps(d.get("errors"), ensure_ascii=False)[:300])
    img = base64.b64decode(d["result"]["image"])
    with open(out, "wb") as f:
        f.write(img)
    print(out, len(img), "字节")


if __name__ == "__main__":
    main()
