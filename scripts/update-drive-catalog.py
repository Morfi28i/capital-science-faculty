#!/usr/bin/env python3
"""Rebuild data/drive-catalog.json by crawling the public Google Drive folders of every year root.

Usage:
  python3 scripts/update-drive-catalog.py [--dry-run] [--report PATH] [--candidate PATH]
                                          [--allow-removals] [--allow-large]

The year roots, their order and their names are fixed in YEAR_ROOTS below. The script opens every
public folder page under each root, reads the file listing Drive embeds in the page, follows shortcuts
to their targets, and builds one catalog row per folder/file with its parent folder ID and its current
Drive name, in breadth-first crawl order.

Safety for unattended runs:
- A folder whose listing still fails after retries keeps its previous subtree from the old catalog and
  is reported as "stale". A row is removed only when its parent folder was listed successfully.
- The candidate must pass every gate in scripts/validate-catalog.py; otherwise nothing is written and
  the exit code is 2.
- The catalog is rewritten only when the set of (id, parentId, title, type, url) changed, so a run
  against an unchanged Drive leaves the file byte-identical.

Exit codes: 0 success (changed or not), 1 unexpected error, 2 a gate failed.
"""
import argparse
import concurrent.futures
import importlib.util
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
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
    # 2026/2027 has no Drive folder of its own: it shows two folders side by side, ours first.
    # 'by' is shown next to each folder's name on the site.
    {'id': 'materials-2026-2027', 'title': 'ماتيريال 2026/2027', 'titleEn': 'Study materials · 2026/2027',
     'category': '2026/2027', 'categoryAr': 'دفعة 2026/2027', 'categoryEn': 'Class of 2026/27',
     'url': 'https://drive.google.com/drive/folders/1r1VT0p5kOKFReaHfs8162PiMjKFZ190K',
     'sources': [{'id': '1r1VT0p5kOKFReaHfs8162PiMjKFZ190K', 'name': '1st Physics Group (B)', 'by': 'Morfi'},
                 {'id': '10egV3LBAs9fEo3HjghyjnsQBuzcdnvgX', 'name': '1st Physics Group B', 'by': 'Leader'}]},
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
    # Drive sorts a folder's items by the page language, which otherwise follows the caller's location
    # (Arabic names first from Egypt, Latin first from GitHub's US servers). Pinning hl=ar keeps the
    # order, and so the catalog bytes, identical wherever the crawler runs.
    req = urllib.request.Request(
        f'https://drive.google.com/drive/folders/{folder_id}?hl=ar',
        headers={'User-Agent': UA, 'Accept-Language': 'ar'},
    )
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                html = response.read().decode('utf-8', 'replace')
            break
        except Exception:
            if attempt == 1:
                raise
            time.sleep(3)
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


def old_children_index(old):
    """Map folder id → its previous children (in previous order), for keeping stale subtrees."""
    children = {}
    for row in old:
        if isinstance(row, dict) and row.get('parentId'):
            children.setdefault(row['parentId'], []).append(row)
    return children


def from_old(row):
    """Turn a previous catalog row back into a crawl child, keeping its previous URL."""
    return {'id': row['id'], 'name': row['title'], 'mime': FOLDER if row.get('type') == 'folder' else 'stale',
            'url': row.get('url'), 'stale': True}


WORKERS = 4
MAX_CONSECUTIVE_FAILURES = 25


GONE = 'gone from Drive (HTTP 404)'


def fetch_listing(lister, folder_id, delay):
    """List one folder: (children, None) on success, (None, reason) on failure.

    A 404 means Drive says the folder no longer exists (for example a shortcut to a deleted folder);
    that is reported as GONE so the folder is removed instead of being kept from the old catalog."""
    try:
        children = lister(folder_id)
        if children is None:
            # Drive occasionally serves a page without the listing under load; try once more.
            time.sleep(delay * 10)
            children = lister(folder_id)
        time.sleep(delay)
        return (children, None) if children is not None else (None, 'no public listing')
    except urllib.error.HTTPError as error:
        return None, GONE if error.code == 404 else str(error)
    except Exception as error:
        return None, str(error)


def crawl(root_id, previous_children, lister=None, delay=0.4):
    """Breadth-first walk. Returns (rows, problems, stale) where stale lists folders kept from before.

    Folders of one depth level are fetched in parallel (WORKERS at a time) but processed in queue order,
    so the output is exactly what a one-at-a-time breadth-first walk would produce."""
    lister = lister or list_folder
    seen, level, rows, problems, stale, gone = {root_id}, [(root_id, [], False)], [], [], [], set()
    failures_in_a_row = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        while level:
            next_level = []
            # Submit a few folders at a time so the failure breaker can stop the rest of a level.
            batches = [level[i:i + WORKERS * 2] for i in range(0, len(level), WORKERS * 2)]
            for batch in batches:
                # Stop fetching once Drive keeps failing; the rest is kept from the old catalog.
                breaker = failures_in_a_row >= MAX_CONSECUTIVE_FAILURES
                jobs = [None if offline or breaker else pool.submit(fetch_listing, lister, folder_id, delay)
                        for folder_id, _, offline in batch]
                failures_in_a_row = visit_batch(batch, jobs, previous_children, seen, rows, problems, stale,
                                                next_level, failures_in_a_row, gone)
            if sys.stderr.isatty():
                print(f'  {len(rows)} items, {len(next_level)} folders in next level', file=sys.stderr, end='\r')
            level = next_level
    if sys.stderr.isatty():
        print(file=sys.stderr)
    # Folders Drive reports as deleted are removed; they never have children in the output.
    rows = [row for row in rows if row['id'] not in gone]
    return rows, problems, stale


def visit_batch(batch, jobs, previous_children, seen, rows, problems, stale, next_level, failures_in_a_row,
                gone=None):
    """Record one batch of folder listings in queue order; returns the updated failure streak."""
    for (folder_id, path, offline), job in zip(batch, jobs):
        if job is None:
            children, failure = None, 'below the depth/size guard' if offline else 'stopped after repeated Drive failures'
        else:
            children, failure = job.result()
            failures_in_a_row = 0 if children is not None or failure == GONE else failures_in_a_row + 1
        if failure == GONE and gone is not None:
            gone.add(folder_id)
            problems.append(f"{'/'.join(path) or 'root'}: {failure}, removed")
            continue
        if children is None:
            # Keep what we had for this folder; never delete rows whose parent could not be listed.
            children = [from_old(row) for row in previous_children.get(folder_id, [])]
            problems.append(f"{'/'.join(path) or 'root'}: {failure}")
            stale.append({'id': folder_id, 'note': ' › '.join(path), 'reason': failure, 'kept': len(children)})
        for child in children:
            if child['id'] in seen or child['mime'] == SHORTCUT:
                continue
            seen.add(child['id'])
            rows.append({**child, 'parentId': folder_id, 'path': path})
            if child['mime'] == FOLDER:
                # Guard against shortcuts that lead into huge or very deep foreign trees: beyond it,
                # keep the previous subtree instead of fetching.
                guarded = len(path) >= 12 or len(rows) >= 8000
                next_level.append((child['id'], path + [child['name']], offline or guarded))
    return failures_in_a_row


def item_url(row):
    if row.get('stale') and row.get('url'):
        return row['url']
    if row['mime'] == FOLDER:
        return f"https://drive.google.com/drive/folders/{row['id']}"
    docs = {'document': 'document', 'spreadsheet': 'spreadsheets', 'presentation': 'presentation', 'form': 'forms'}
    for kind, path in docs.items():
        if row['mime'] == f'application/vnd.google-apps.{kind}':
            return f"https://docs.google.com/{path}/d/{row['id']}/view"
    return f"https://drive.google.com/file/d/{row['id']}/view"


def load_validator():
    path = Path(__file__).resolve().parent / 'validate-catalog.py'
    spec = importlib.util.spec_from_file_location('validate_catalog', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def with_sources(lister, year):
    """For a year without its own Drive folder, list its source folders as the root's children."""
    if not year.get('sources'):
        return lister

    def listing(folder_id):
        if folder_id == year['id']:
            return [{'id': x['id'], 'name': x['name'], 'mime': FOLDER, 'by': x['by']} for x in year['sources']]
        return lister(folder_id)

    return listing


def year_url(year):
    return year.get('url') or f"https://drive.google.com/drive/folders/{year['id']}"


def build_catalog(old, lister=None, delay=0.4):
    """Crawl every year root. Returns (catalog, per-year crawl info)."""
    previous_children = old_children_index(old)
    catalog, info = [], {}
    for year in YEAR_ROOTS:
        print(f"Crawling {year['category']} …", file=sys.stderr)
        rows, problems, stale = crawl(year['id'], previous_children, with_sources(lister or list_folder, year), delay)
        base = {k: year[k] for k in ('category', 'categoryAr', 'categoryEn')}
        catalog.append({
            'id': year['id'],
            'title': year['title'],
            'titleAr': year['title'],
            'titleEn': year['titleEn'],
            'url': year_url(year),
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
                **({'by': row['by']} if row.get('by') else {}),
            })
        fresh = sum(1 for row in rows if not row.get('stale'))
        info[year['category']] = {'problems': problems, 'stale': stale, 'fresh': fresh}
        for problem in problems:
            print(f'  ! {problem}', file=sys.stderr)
    return catalog, info


def serialize(catalog):
    return json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'


def run_context():
    """Identify the run: GitHub Actions variables when present, otherwise a local id."""
    now = datetime.now(timezone.utc)
    run_id = os.environ.get('GITHUB_RUN_ID')
    attempt = os.environ.get('GITHUB_RUN_ATTEMPT', '1')
    server, repo = os.environ.get('GITHUB_SERVER_URL'), os.environ.get('GITHUB_REPOSITORY')
    return {
        'runId': f'{run_id}-{attempt}' if run_id else f"local-{now.strftime('%Y%m%dT%H%M%SZ')}",
        'runUrl': f'{server}/{repo}/actions/runs/{run_id}' if run_id and server and repo else None,
        'trigger': os.environ.get('SYNC_TRIGGER') or os.environ.get('GITHUB_EVENT_NAME') or 'local',
    }


def main(argv=None, lister=None, catalog_path=None, delay=0.4):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true', help='never write the catalog')
    parser.add_argument('--report', help='write a machine-readable JSON report to this path')
    parser.add_argument('--candidate', help='always write the candidate catalog to this path (for review)')
    parser.add_argument('--allow-removals', action='store_true', help='allow a year to drop many rows')
    parser.add_argument('--allow-large', action='store_true', help='allow more than the usual number of new rows')
    args = parser.parse_args(argv)
    catalog_path = Path(catalog_path or CATALOG)
    validator = load_validator()
    started = datetime.now(timezone.utc)
    old_text = catalog_path.read_text(encoding='utf-8')
    old = json.loads(old_text)

    candidate, info = build_catalog(old, lister, delay)
    errors = validator.validate(old, candidate, YEAR_ROOTS, args.allow_removals, args.allow_large)
    for year in YEAR_ROOTS:
        # A year whose listings all failed would only repeat old rows; treat it as a failed run.
        if info[year['category']]['fresh'] == 0 and not any(e['code'] == 'empty_year' for e in errors):
            errors.append(validator.gate('empty_year', f"{year['title']} returned no rows from Drive.",
                                         [year['category']]))
    years = validator.diff(old, candidate, YEAR_ROOTS)
    for category, crawl_info in info.items():
        years[category]['stale'] = crawl_info['stale']
        years[category]['problems'] = crawl_info['problems'][:validator.REPORT_LIST_LIMIT]
    totals = {name: sum(y['counts'][name] for y in years.values())
              for name in ('added', 'removed', 'renamed', 'moved', 'changed')}
    totals['stale'] = sum(len(y['stale']) for y in years.values())
    changed = any(totals[name] for name in ('added', 'removed', 'renamed', 'moved', 'changed'))
    if args.candidate:
        Path(args.candidate).write_text(serialize(candidate), encoding='utf-8')

    wrote = False
    if not errors and changed and not args.dry_run:
        catalog_path.write_text(serialize(candidate), encoding='utf-8')
        wrote = True
    finished = datetime.now(timezone.utc)
    report = {
        'schemaVersion': 1,
        **run_context(),
        'mode': 'dry-run' if args.dry_run else 'write',
        'startedAt': started.isoformat(timespec='seconds'),
        'finishedAt': finished.isoformat(timespec='seconds'),
        'durationSec': round((finished - started).total_seconds()),
        'ok': not errors,
        'changed': changed,
        'wrote': wrote,
        'rows': {'before': len(old), 'after': len(candidate)},
        'totals': totals,
        'gates': errors,
        'years': years,
        'flags': {'allowRemovals': args.allow_removals, 'allowLarge': args.allow_large},
    }
    if args.report:
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    for category, year in years.items():
        print(f"  {category}: {year['before']} → {year['after']} rows · " +
              ', '.join(f'{name} {count}' for name, count in year['counts'].items()) +
              f", stale {len(year['stale'])}", file=sys.stderr)
    if errors:
        for error in errors:
            print(f"✗ gate {error['code']}: {error['message']}", file=sys.stderr)
        print('Nothing written.', file=sys.stderr)
        return 2
    if not changed:
        print('No changes on Drive; catalog left untouched.')
    elif args.dry_run:
        print('Dry run: changes found, catalog not written.')
    else:
        print(f'Wrote {len(candidate)} entries to {catalog_path}')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:  # Unexpected failure: show it and leave the catalog untouched.
        import traceback
        traceback.print_exc()
        sys.exit(1)
