#!/usr/bin/env python3
"""Safety gates for data/drive-catalog.json (standard library only).

Usage:
  python3 scripts/validate-catalog.py CANDIDATE [--old OLD] [--allow-removals] [--allow-large] [--json]

Checks the candidate on its own (structure gates) and, when --old is given, against the previous
catalog (change gates). Exits 0 when every gate passes and 2 when any gate fails. The same functions
are used by scripts/update-drive-catalog.py before it writes anything.
"""
import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

ROOT_NOTE = 'المجلد الرئيسي'
SEMESTER_NOTE = 'مجلد السنة'
# Drive sources that were replaced and must never reappear in the catalog.
REMOVED_SOURCES = ['1_xmVYVlPbaf_iJqcYlGJnPR-ROMUY-FD']
# The catalog mirrors Drive: deletions and additions are applied automatically. These limits only stop
# changes so large that they almost certainly come from a Drive glitch, not from real edits.
MAX_REMOVED_SHARE = 0.5
MAX_ADDED = 3000
REPORT_LIST_LIMIT = 200
URL_PREFIXES = ('https://drive.google.com/', 'https://docs.google.com/')
ROW_KEYS = ['id', 'parentId', 'title', 'url', 'kind', 'file', 'type', 'category', 'categoryAr', 'categoryEn', 'note']


def load_year_roots():
    """YEAR_ROOTS lives only in update-drive-catalog.py; load it from there."""
    path = Path(__file__).resolve().parent / 'update-drive-catalog.py'
    spec = importlib.util.spec_from_file_location('update_drive_catalog', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.YEAR_ROOTS


def root_entry(year):
    """The exact row every year root must have in the catalog."""
    return {
        'id': year['id'],
        'title': year['title'],
        'titleAr': year['title'],
        'titleEn': year['titleEn'],
        'url': year.get('url') or f"https://drive.google.com/drive/folders/{year['id']}",
        'kind': 'drive',
        'file': False,
        'type': 'folder',
        'category': year['category'],
        'categoryAr': year['categoryAr'],
        'categoryEn': year['categoryEn'],
        'note': ROOT_NOTE,
        'noteEn': 'Year root',
    }


def gate(code, message, details=None):
    return {'code': code, 'message': message, 'details': details or []}


def structure_errors(catalog, year_roots):
    """Gates that need only the candidate: shape, roots, unique ids, parents, removed sources."""
    if not isinstance(catalog, list):
        return [gate('invalid_json', 'The catalog must be a JSON array.')]
    errors = []
    bad_rows = []
    for index, row in enumerate(catalog):
        if not isinstance(row, dict) or not isinstance(row.get('id'), str) or not row.get('id'):
            bad_rows.append(f'row {index}: missing id')
            continue
        if not isinstance(row.get('title'), str) or not row['title'].strip():
            bad_rows.append(f"{row['id']}: empty title")
        if row.get('type') not in ('folder', 'file') or row.get('file') is not (row.get('type') == 'file'):
            bad_rows.append(f"{row['id']}: type/file mismatch")
        if not isinstance(row.get('url'), str) or not row['url'].startswith(URL_PREFIXES):
            bad_rows.append(f"{row['id']}: url is not a Google Drive/Docs https link")
    if bad_rows:
        errors.append(gate('invalid_row', 'Some rows are malformed.', bad_rows[:50]))
        return errors

    by_id = {}
    duplicates = []
    for row in catalog:
        if row['id'] in by_id:
            duplicates.append(row['id'])
        by_id[row['id']] = row
    if duplicates:
        errors.append(gate('duplicate_id', 'Some ids appear more than once.', duplicates[:50]))

    categories = [year['category'] for year in year_roots]
    root_positions = []
    for year in year_roots:
        expected = root_entry(year)
        row = by_id.get(year['id'])
        if row is None:
            errors.append(gate('missing_root', f"Year root {year['title']} is missing.", [year['id']]))
            continue
        if row != expected:
            changed = sorted(k for k in set(row) | set(expected) if row.get(k) != expected.get(k))
            errors.append(gate('root_mismatch', f"Year root {year['title']} has changed fields.", changed))
        root_positions.append(catalog.index(row))
    if root_positions != sorted(root_positions):
        errors.append(gate('root_order', 'Year roots are not in YEAR_ROOTS order.'))
    root_ids = {year['id'] for year in year_roots}
    extra_roots = [r['id'] for r in catalog if r.get('note') == ROOT_NOTE and r['id'] not in root_ids]
    if extra_roots:
        errors.append(gate('unknown_root', 'A year root that is not in YEAR_ROOTS appeared.', extra_roots))

    missing_parent, wrong_category, unreachable = [], [], []
    for row in catalog:
        if row['id'] in root_ids:
            continue
        parent = by_id.get(row.get('parentId'))
        if parent is None:
            missing_parent.append(f"{row['id']} → {row.get('parentId')}")
            continue
        if parent.get('type') != 'folder' or parent.get('category') != row.get('category'):
            wrong_category.append(row['id'])
        if row.get('category') not in categories:
            wrong_category.append(row['id'])
        # Walk up to a root; a cycle or dead end means the row would float outside every year.
        seen, current = set(), row
        while current['id'] not in root_ids:
            if current['id'] in seen or current.get('parentId') not in by_id:
                unreachable.append(row['id'])
                break
            seen.add(current['id'])
            current = by_id[current['parentId']]
    if missing_parent:
        errors.append(gate('missing_parent', 'Some rows point to a parent that does not exist.', missing_parent[:50]))
    if wrong_category:
        errors.append(gate('wrong_category', 'Some rows sit under a parent of another year or a file.',
                           sorted(set(wrong_category))[:50]))
    if unreachable:
        errors.append(gate('unreachable', 'Some rows do not lead back to a year root.', unreachable[:50]))

    removed_hits = [r['id'] for r in catalog
                    if any(src in str(r.get(field) or '') for src in REMOVED_SOURCES
                           for field in ('id', 'parentId', 'url'))]
    if removed_hits:
        errors.append(gate('removed_source', 'Entries from the removed 2025 source came back.', removed_hits[:50]))
    return errors


def key(row):
    return (row.get('id'), row.get('parentId'), row.get('title'), row.get('type'), row.get('url'))


def summary(row):
    return {'id': row['id'], 'title': row.get('title'), 'type': row.get('type'), 'note': row.get('note')}


def diff(old, new, year_roots):
    """Per-year added/removed/renamed/moved/changed, compared by id. Order-only changes are ignored."""
    old_by_id = {r['id']: r for r in old if isinstance(r, dict) and 'id' in r}
    new_by_id = {r['id']: r for r in new}
    years = {}
    for year in year_roots:
        cat = year['category']
        old_ids = {i for i, r in old_by_id.items() if r.get('category') == cat}
        new_ids = {i for i, r in new_by_id.items() if r.get('category') == cat}
        buckets = {'added': [], 'removed': [], 'renamed': [], 'moved': [], 'changed': []}
        for i in new_ids - old_ids:
            buckets['added'].append(summary(new_by_id[i]))
        for i in old_ids - new_ids:
            buckets['removed'].append(summary(old_by_id[i]))
        for i in old_ids & new_ids:
            a, b = old_by_id[i], new_by_id[i]
            if key(a) == key(b):
                continue
            if a.get('title') != b.get('title'):
                buckets['renamed'].append({**summary(b), 'from': a.get('title')})
            if a.get('parentId') != b.get('parentId'):
                buckets['moved'].append({**summary(b), 'fromNote': a.get('note')})
            if (a.get('type'), a.get('url')) != (b.get('type'), b.get('url')):
                buckets['changed'].append(summary(b))
        # Stable order inside each bucket so the same Drive state always gives the same report.
        for name in buckets:
            buckets[name].sort(key=lambda x: (x.get('note') or '', x.get('title') or '', x['id']))
        years[cat] = {
            'before': len(old_ids),
            'after': len(new_ids),
            'counts': {name: len(items) for name, items in buckets.items()},
            **{name: items[:REPORT_LIST_LIMIT] for name, items in buckets.items()},
        }
    return years


def change_errors(old, new, year_roots, allow_removals=False, allow_large=False):
    """Gates that compare the candidate with the previous catalog."""
    errors = []
    old_ids = {r['id'] for r in old if isinstance(r, dict) and 'id' in r}
    new_ids = {r['id'] for r in new if isinstance(r, dict) and 'id' in r}
    for year in year_roots:
        cat = year['category']
        before = sum(1 for r in old if isinstance(r, dict) and r.get('category') == cat)
        after = sum(1 for r in new if isinstance(r, dict) and r.get('category') == cat)
        if after <= 1:
            errors.append(gate('empty_year', f"{year['title']} returned no rows.", [cat]))
            continue
        limit = max(10, math.ceil(before * MAX_REMOVED_SHARE))
        if before - after > limit and not allow_removals:
            errors.append(gate('too_many_removals',
                               f"{year['title']} would drop {before - after} rows (limit {limit}).",
                               [cat, before, after]))
    added = len(new_ids - old_ids)
    if added > MAX_ADDED and not allow_large:
        errors.append(gate('too_many_additions', f'{added} new rows (limit {MAX_ADDED}).', [added]))
    return errors


def validate(old, new, year_roots, allow_removals=False, allow_large=False):
    errors = structure_errors(new, year_roots)
    if errors and errors[0]['code'] == 'invalid_json':
        return errors
    if old is not None:
        errors += change_errors(old, new, year_roots, allow_removals, allow_large)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('candidate')
    parser.add_argument('--old')
    parser.add_argument('--allow-removals', action='store_true')
    parser.add_argument('--allow-large', action='store_true')
    parser.add_argument('--json', action='store_true', help='print the gate results as JSON')
    args = parser.parse_args()
    try:
        candidate = json.loads(Path(args.candidate).read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        errors = [gate('invalid_json', f'Cannot read candidate: {error}')]
    else:
        old = json.loads(Path(args.old).read_text(encoding='utf-8')) if args.old else None
        errors = validate(old, candidate, load_year_roots(), args.allow_removals, args.allow_large)
    if args.json:
        print(json.dumps(errors, ensure_ascii=False, indent=2))
    else:
        for error in errors:
            print(f"✗ {error['code']}: {error['message']}", file=sys.stderr)
        if not errors:
            print('✓ all catalog gates passed')
    sys.exit(2 if errors else 0)


if __name__ == '__main__':
    main()
