#!/usr/bin/env python3
"""Rebuild data/drive-catalog.json by crawling the public Google Drive folders of every year root.

Usage:  python3 scripts/update-drive-catalog.py

The year roots, their order and their names are fixed in YEAR_ROOTS below. The script opens every
public folder page under each root, reads the file listing Drive embeds in the page, follows shortcuts
to their targets, and writes one catalog row per folder/file with its parent folder ID and its current
Drive name. Items deleted from Drive disappear and new ones are added. Nothing is written if a year
fails to load.
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
# The three year roots, in display order, with their fixed names. Edit here to add a new year.
YEAR_ROOTS = [
    {'id': '1hvZIcXA4Xc45X_YXJXnK9V0q5CC6Ye1W', 'title': 'ماتيريال 2024/2025', 'titleEn': 'Study materials · 2024/2025',
     'category': '2024/2025', 'categoryAr': 'دفعة 2024/2025', 'categoryEn': 'Class of 2024/25'},
    {'id': '1WhpUU4jCUmcOwdapwVRDK5UIK5b7xuU4', 'title': 'ماتيريال 2025/2026', 'titleEn': 'Study materials · 2025/2026',
     'category': '2025/2026', 'categoryAr': 'دفعة 2025/2026', 'categoryEn': 'Class of 2025/26'},
    {'id': '10egV3LBAs9fEo3HjghyjnsQBuzcdnvgX', 'title': 'ماتيريال 2026/2027', 'titleEn': 'Study materials · 2026/2027',
     'category': '2026/2027', 'categoryAr': 'دفعة 2026/2027', 'categoryEn': 'Class of 2026/27'},
]
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


def main():
    old = json.loads(CATALOG.read_text(encoding='utf-8'))
    catalog = []
    for year in YEAR_ROOTS:
        print(f"Crawling {year['category']} …", file=sys.stderr)
        rows, problems = crawl(year['id'])
        if not rows:
            sys.exit(f"Stopped: {year['category']} returned nothing ({problems[:1]}). Catalog left unchanged.")
        base = {k: year[k] for k in ('category', 'categoryAr', 'categoryEn')}
        catalog.append({
            'id': year['id'],
            'title': year['title'],
            'titleAr': year['title'],
            'titleEn': year['titleEn'],
            'url': f"https://drive.google.com/drive/folders/{year['id']}",
            'kind': 'drive',
            'file': False,
            'type': 'folder',
            **base,
            'note': ROOT_NOTE,
            'noteEn': 'Year root',
        })
        # Everything below a root takes its current name from Drive, so renames there show up here.
        for row in rows:
            catalog.append({
                'id': row['id'],
                'parentId': row['parentId'],
                'title': row['name'],
                'url': item_url(row),
                'kind': 'drive',
                'file': row['mime'] != FOLDER,
                'type': 'folder' if row['mime'] == FOLDER else 'file',
                **base,
                'note': ' › '.join(row['path']) if row['path'] else 'مجلد السنة',
            })
        old_count = sum(1 for x in old if x['category'] == year['category'])
        print(f"  {year['category']}: {old_count} → {len(rows) + 1} entries", file=sys.stderr)
        for problem in problems:
            print(f'  ! {problem}', file=sys.stderr)
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(catalog)} entries to {CATALOG}')


if __name__ == '__main__':
    main()
