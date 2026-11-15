#!/usr/bin/env python3
"""把飞书知识库里的策划文档导出成本地文本,供复刻时查阅。

用法:
    FEISHU_APP_ID=... FEISHU_APP_SECRET=... python3 tools/feishu_export.py <知识库节点 token 或链接> [--out 目录]

- 凭据只从环境变量读,不写进任何文件,也不打印。
- 默认导出到 .work/planning/(已在 .gitignore 里)。**策划文档是内部资料,不要提交进这个公开仓库。**
- 应用需要有知识库和文档的只读权限,并且被加为该知识库(或文档)的协作者。
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request

API = "https://open.feishu.cn/open-apis"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def call(method, path, token=None, body=None, query=None):
    url = API + path + ("?" + urllib.parse.urlencode(query) if query else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json; charset=utf-8")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except Exception:
            return {"code": e.code, "msg": str(e)}


def tenant_token():
    app_id, secret = os.environ.get("FEISHU_APP_ID"), os.environ.get("FEISHU_APP_SECRET")
    if not app_id or not secret:
        sys.exit("缺少环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET")
    r = call("POST", "/auth/v3/tenant_access_token/internal", body={"app_id": app_id, "app_secret": secret})
    if r.get("code") != 0:
        sys.exit("取令牌失败: code=%s msg=%s" % (r.get("code"), r.get("msg")))
    return r["tenant_access_token"]


def safe(name):
    return re.sub(r'[\\/:*?"<>|\s]+', "_", name).strip("_")[:80] or "untitled"


def children(tok, space, parent):
    out, page = [], None
    while True:
        q = {"parent_node_token": parent, "page_size": 50}
        if page:
            q["page_token"] = page
        r = call("GET", "/wiki/v2/spaces/%s/nodes" % space, tok, query=q)
        if r.get("code") != 0:
            print("  列子节点失败:", r.get("code"), r.get("msg"))
            return out
        d = r.get("data", {})
        out += d.get("items", [])
        if not d.get("has_more"):
            return out
        page = d.get("page_token")


LINKS = []  # 表格单元格里提到的其他文档:(种类, token, 标题)
SEEN = set()


def collect_links(cell):
    if isinstance(cell, list):
        for c in cell:
            collect_links(c)
    elif isinstance(cell, dict):
        m = re.search(r"/(wiki|docx|docs|sheets)/([A-Za-z0-9]+)", cell.get("link") or "")
        if m and not any(l[1] == m.group(2) for l in LINKS):
            LINKS.append((m.group(1), m.group(2), cell.get("text") or ""))


def board_text(tok, doc_token):
    """文档里嵌的白板:把白板上每个带字的节点按从上到下、从左到右的顺序列出来。"""
    r = call("GET", "/docx/v1/documents/%s/blocks" % doc_token, tok, query={"page_size": 200})
    out = []
    for b in (r.get("data") or {}).get("items") or []:
        wb = (b.get("board") or {}).get("token")
        if not wb:
            continue
        n = call("GET", "/board/v1/whiteboards/%s/nodes" % wb, tok)
        if n.get("code") != 0:
            out.append("(白板读取失败 %s %s)" % (n.get("code"), n.get("msg")))
            continue
        items = []
        for x in (n.get("data") or {}).get("nodes") or []:
            t = ((x.get("text") or {}).get("text") or "").strip()
            if t:
                items.append((round((x.get("y") or 0) / 40), x.get("x") or 0, t.replace("\n", " / ")))
        out.append("## 白板(%d 条文字)\n" % len(items))
        out += [t for _, _, t in sorted(items)]
    return "\n".join(out)


def export_node(tok, node, out, depth, index):
    if node.get("node_token") in SEEN:
        return
    SEEN.add(node.get("node_token"))
    title, typ, obj = node.get("title", ""), node.get("obj_type"), node.get("obj_token")
    line = "%s- %s [%s]" % ("  " * depth, title, typ)
    text = None
    if typ in ("docx", "doc"):
        path = "/docx/v1/documents/%s/raw_content" if typ == "docx" else "/doc/v2/%s/raw_content"
        r = call("GET", path % obj, tok, query={"lang": 0})
        if r.get("code") == 0:
            text = r["data"].get("content", "")
            if typ == "docx":
                extra = board_text(tok, obj)
                if extra:
                    text += "\n\n" + extra
        else:
            line += "  (读取失败 %s %s)" % (r.get("code"), r.get("msg"))
    elif typ == "sheet":
        r = call("GET", "/sheets/v3/spreadsheets/%s/sheets/query" % obj, tok)
        if r.get("code") == 0:
            parts = []
            for sh in r["data"].get("sheets", []):
                v = call("GET", "/sheets/v2/spreadsheets/%s/values/%s" % (obj, sh["sheet_id"]), tok,
                         query={"valueRenderOption": "ToString"})
                rows = (v.get("data", {}).get("valueRange", {}) or {}).get("values") or []
                raw = call("GET", "/sheets/v2/spreadsheets/%s/values/%s" % (obj, sh["sheet_id"]), tok)
                collect_links((raw.get("data", {}).get("valueRange", {}) or {}).get("values") or [])
                parts.append("## 工作表:%s\n" % sh.get("title", ""))
                for row in rows:
                    if any(c not in (None, "") for c in row):
                        parts.append("\t".join("" if c is None else str(c).replace("\n", " ") for c in row))
            text = "\n".join(parts)
        else:
            line += "  (读取失败 %s %s)" % (r.get("code"), r.get("msg"))
    else:
        line += "  (这种类型接口读不了,需要人工导出)"
    if text is not None:
        name = "%02d_%s.txt" % (len(index), safe(title))
        with open(os.path.join(out, name), "w", encoding="utf-8") as f:
            f.write("# %s\n\n%s\n" % (title, text))
        line += "  -> %s (%d 字)" % (name, len(text))
    index.append(line)
    print(line)
    if node.get("has_child"):
        for ch in children(tok, node["space_id"], node["node_token"]):
            export_node(tok, ch, out, depth + 1, index)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("node")
    ap.add_argument("--out", default=os.path.join(ROOT, ".work", "planning"))
    a = ap.parse_args()
    m = re.search(r"/wiki/([A-Za-z0-9]+)", a.node)
    node_token = m.group(1) if m else a.node
    os.makedirs(a.out, exist_ok=True)
    tok = tenant_token()
    r = call("GET", "/wiki/v2/spaces/get_node", tok, query={"token": node_token})
    if r.get("code") != 0:
        sys.exit("读不到这个节点: code=%s msg=%s" % (r.get("code"), r.get("msg")))
    index = []
    export_node(tok, r["data"]["node"], a.out, 0, index)
    # 再导出索引表里链接到的文档(只跟一层)
    for kind, t, title in list(LINKS):
        if kind == "wiki":
            rr = call("GET", "/wiki/v2/spaces/get_node", tok, query={"token": t})
            if rr.get("code") != 0:
                index.append("  - %s (读不到: %s %s)" % (title, rr.get("code"), rr.get("msg")))
                print(index[-1])
                continue
            node = rr["data"]["node"]
        else:  # 不在知识库里的文档,直接按类型读
            node = {"title": title, "obj_token": t, "node_token": t, "obj_type": {"docx": "docx", "docs": "doc", "sheets": "sheet"}[kind]}
        export_node(tok, node, a.out, 1, index)
    with open(os.path.join(a.out, "INDEX.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(index) + "\n")
    print("共 %d 个节点,目录在 %s" % (len(index), a.out))


if __name__ == "__main__":
    main()
