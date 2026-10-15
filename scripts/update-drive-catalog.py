#!/usr/bin/env python3
"""Rebuild data/drive-catalog.json by crawling the public Google Drive folders of every year root.

Usage:  python3 scripts/update-drive-catalog.py

Each year root is a record in the catalog whose note is "المجلد الرئيسي". The script opens every
public folder page under it, reads the file listing Drive embeds in the page, follows shortcuts to
their targets, and writes one catalog row per folder/file with its parent folder ID. Curated titles
(titleAr/titleEn) from the previous catalog are kept. Nothing is written if any year fails to load.
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

CATALOG = Path(__file__).resolve().parent.parent / 'data' / 'drive-catalog.json'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/128 Safari/537.36'
FOLDER = 'application/vnd.google-apps.folder'
SHORTCUT = 'application/vnd.google-apps.shortcut'
ROOT_NOTE = 'المجلد الرئيسي'
ESC = {'n': '\n', 't': '\t', 'r': '\r', 'b': '\b', 'f': '\f', 'v': '\v', '0': '\0'}


def js_unescape(s):
    """Decode the body of a JavaScript single-quoted string literal."""
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c != '\\':
            out.append(c)
            i += 1
        elif s[i + 1] == 'x':
            out.append(chr(int(s[i + 2:i + 4], 16)))
            i += 4
        elif s[i + 1] == 'u':
            out.append(chr(int(s[i + 2:i + 6], 16)))
            i += 6
        else:
            out.append(ESC.get(s[i + 1], s[i + 1]))
            i += 2
    return ''.join(out)


def list_folder(folder_id):
    """Return the children of a public folder, or None when Drive does not expose a listing."""
    req = urllib.request.Request(
        f'https://drive.google.com/drive/folders/{folder_id}',
        headers={'User-Agent': UA, 'Accept-Language': 'en'},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as response:
                html = response.read().decode('utf-8', 'replace')
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 + attempt * 3)
    match = re.search(r"window\['_DRIVE_ivd'\]\s*=\s*'((?:[^'\\]|\\.)*)'", html, re.S)
    if not match:
        return None
    children = []
    for item in json.loads(js_unescape(match.group(1)))[0] or []:
        row = {'id': item[0], 'name': item[2].strip(), 'mime': item[3]}
        if item[3] == SHORTCUT:
            # A shortcut stores its target as [targetId, null, targetMime, ...] further along the record.
            for part in item[4:]:
                if (isinstance(part, list) and len(part) >= 3 and isinstance(part[0], str)
                        and isinstance(part[2], str) and '/' in part[2] and len(part[0]) > 20):
                    row['id'], row['mime'] = part[0], part[2]
                    break
        children.append(row)
    return children


def crawl(root_id):
    seen, queue, rows, problems = {root_id}, [(root_id, [])], [], []
    while queue:
        folder_id, path = queue.pop(0)
        try:
            children = list_folder(folder_id)
            if children is None:
                # Drive occasionally serves a page without the listing under load; try once more.
                time.sleep(4)
                children = list_folder(folder_id)
        except Exception as error:
            problems.append(f"{'/'.join(path) or 'root'}: {error}")
            continue
        if children is None:
            problems.append(f"{'/'.join(path) or 'root'}: no public listing")
            continue
        for child in children:
            if child['id'] in seen or child['mime'] == SHORTCUT:
                continue
            seen.add(child['id'])
            rows.append({**child, 'parentId': folder_id, 'path': path})
            # Guard against shortcuts that lead into huge or very deep foreign trees.
            if child['mime'] == FOLDER and len(path) < 12 and len(rows) < 8000:
                queue.append((child['id'], path + [child['name']]))
        time.sleep(0.4)
        print(f'  {len(rows)} items, {len(queue)} folders left', file=sys.stderr, end='\r')
    print(file=sys.stderr)
    return rows, problems


def item_url(row):
    if row['mime'] == FOLDER:
        return f"https://drive.google.com/drive/folders/{row['id']}"
    docs = {'document': 'document', 'spreadsheet': 'spreadsheets', 'presentation': 'presentation', 'form': 'forms'}
    for kind, path in docs.items():
        if row['mime'] == f'application/vnd.google-apps.{kind}':
            return f"https://docs.google.com/{path}/d/{row['id']}/view"
    return f"https://drive.google.com/file/d/{row['id']}/view"


def item_id(entry):
    match = re.search(r'/(?:folders|d)/([\w-]+)', entry.get('url', ''))
    return entry.get('id') or (match and match.group(1))


def main():
    old = json.loads(CATALOG.read_text(encoding='utf-8'))
    previous = {item_id(x): x for x in old if item_id(x)}
    roots = [x for x in old if x.get('note') == ROOT_NOTE]
    catalog = []
    for root in roots:
        root = {**root, 'id': item_id(root)}
        print(f"Crawling {root['category']} …", file=sys.stderr)
        rows, problems = crawl(root['id'])
        if not rows:
            sys.exit(f"Stopped: {root['category']} returned nothing ({problems[:1]}). Catalog left unchanged.")
        catalog.append(root)
        for row in rows:
            before = previous.get(row['id'], {})
            entry = {
                'id': row['id'],
                'parentId': row['parentId'],
                'title': before.get('title') or row['name'],
                'url': item_url(row),
                'kind': 'drive',
                'file': row['mime'] != FOLDER,
                'type': 'folder' if row['mime'] == FOLDER else 'file',
                'category': root['category'],
                'categoryAr': root.get('categoryAr'),
                'categoryEn': root.get('categoryEn'),
                'note': ' › '.join(row['path']) if row['path'] else 'مجلد السنة',
            }
            for key in ('titleAr', 'titleEn'):
                if before.get(key):
                    entry[key] = before[key]
            catalog.append(entry)
        old_count = sum(1 for x in old if x['category'] == root['category'])
        print(f"  {root['category']}: {old_count} → {len(rows) + 1} entries", file=sys.stderr)
        for problem in problems:
            print(f'  ! {problem}', file=sys.stderr)
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(catalog)} entries to {CATALOG}')


if __name__ == '__main__':
    main()
