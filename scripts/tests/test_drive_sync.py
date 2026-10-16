"""Tests for the Drive catalog gates and the unattended crawl. Run: python3 -m unittest discover -s scripts/tests"""
import copy
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
FOLDER = 'application/vnd.google-apps.folder'
PDF = 'application/pdf'


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


updater = load('update_drive_catalog', 'update-drive-catalog.py')


# The crawler prints progress and gate messages; keep them out of the test output (and CI logs),
# where a fixture's intentional "empty_year" failure would otherwise look like a real one.
_streams = None


def setUpModule():
    global _streams
    _streams = (sys.stdout, sys.stderr)
    sys.stdout = sys.stderr = io.StringIO()


def tearDownModule():
    sys.stdout, sys.stderr = _streams
validator = load('validate_catalog', 'validate-catalog.py')
ROOTS = updater.YEAR_ROOTS


def fake_drive(extra=None):
    """A tiny Drive: each year has one semester folder holding one PDF."""
    drive = {}
    for n, year in enumerate(ROOTS):
        semester, pdf = f'sem{n}xxxxxxxxxxxxxxxxxxxxxxxx', f'pdf{n}xxxxxxxxxxxxxxxxxxxxxxxx'
        drive[year['id']] = [{'id': semester, 'name': 'First Semester', 'mime': FOLDER}]
        drive[semester] = [{'id': pdf, 'name': f'Lecture {n}.pdf', 'mime': PDF}]
        drive[pdf] = []
    for folder, children in (extra or {}).items():
        drive.setdefault(folder, []).extend(children)
    return drive


def lister_for(drive, failing=()):
    def lister(folder_id):
        if folder_id in failing:
            raise OSError('HTTP Error 500')
        return copy.deepcopy(drive.get(folder_id, []))
    return lister


def build(drive, old=None, failing=()):
    catalog, info = updater.build_catalog(old or [], lister_for(drive, failing), delay=0)
    return catalog, info


class StructureGates(unittest.TestCase):
    def setUp(self):
        self.catalog, _ = build(fake_drive())

    def codes(self, catalog):
        return [e['code'] for e in validator.structure_errors(catalog, ROOTS)]

    def test_valid_catalog_passes(self):
        self.assertEqual(self.codes(self.catalog), [])

    def test_not_a_list(self):
        self.assertEqual(self.codes({'a': 1}), ['invalid_json'])

    def test_missing_root(self):
        catalog = [r for r in self.catalog if r['id'] != ROOTS[1]['id']]
        self.assertIn('missing_root', self.codes(catalog))

    def test_root_field_changed(self):
        self.catalog[0]['title'] = 'Materials 2024'
        self.assertIn('root_mismatch', self.codes(self.catalog))

    def test_duplicate_id(self):
        self.catalog.append(dict(self.catalog[-1]))
        self.assertIn('duplicate_id', self.codes(self.catalog))

    def test_missing_parent(self):
        self.catalog[-1]['parentId'] = 'does-not-exist'
        self.assertIn('missing_parent', self.codes(self.catalog))

    def test_removed_2025_source(self):
        bad = dict(self.catalog[-1], id='x' * 33, url='https://drive.google.com/drive/folders/'
                   + validator.REMOVED_SOURCES[0])
        self.catalog.append(bad)
        self.assertIn('removed_source', self.codes(self.catalog))

    def test_malformed_row(self):
        self.catalog[-1]['url'] = 'javascript:alert(1)'
        self.assertIn('invalid_row', self.codes(self.catalog))


class ChangeGates(unittest.TestCase):
    def many_files(self, count):
        """A Drive where the 2024/2025 semester holds `count` PDFs."""
        semester = 'sem0xxxxxxxxxxxxxxxxxxxxxxxx'
        return fake_drive({semester: [{'id': f'many{i:04d}xxxxxxxxxxxxxxxxxxxx', 'name': f'File {i}', 'mime': PDF}
                                      for i in range(count)]})

    def codes(self, old, new, **flags):
        return [e['code'] for e in validator.change_errors(old, new, ROOTS, **flags)]

    def test_small_drop_is_allowed(self):
        old, _ = build(self.many_files(100))
        new, _ = build(self.many_files(91))  # 9 rows gone: under max(10, 3%)
        self.assertEqual(self.codes(old, new), [])

    def test_large_drop_needs_flag(self):
        old, _ = build(self.many_files(100))
        new, _ = build(self.many_files(80))  # 20 rows gone
        self.assertEqual(self.codes(old, new), ['too_many_removals'])
        self.assertEqual(self.codes(old, new, allow_removals=True), [])

    def test_large_addition_needs_flag(self):
        old, _ = build(fake_drive())
        new, _ = build(self.many_files(401))
        self.assertEqual(self.codes(old, new), ['too_many_additions'])
        self.assertEqual(self.codes(old, new, allow_large=True), [])

    def test_empty_year_aborts(self):
        old, _ = build(fake_drive())
        new = [r for r in old if r['category'] != ROOTS[2]['category'] or r['id'] == ROOTS[2]['id']]
        self.assertIn('empty_year', self.codes(old, new))


class Diff(unittest.TestCase):
    def test_order_only_change_is_not_a_change(self):
        old, _ = build(fake_drive())
        new = [old[0]] + list(reversed(old[1:3])) + old[3:]
        years = validator.diff(old, new, ROOTS)
        self.assertTrue(all(not any(y['counts'].values()) for y in years.values()))

    def test_rename_move_add_remove(self):
        old, _ = build(fake_drive())
        drive = fake_drive()
        sem0, pdf0 = 'sem0xxxxxxxxxxxxxxxxxxxxxxxx', 'pdf0xxxxxxxxxxxxxxxxxxxxxxxx'
        drive[sem0] = [{'id': 'newfolderxxxxxxxxxxxxxxxxxxx', 'name': 'Exams', 'mime': FOLDER}]
        drive['newfolderxxxxxxxxxxxxxxxxxxx'] = [{'id': pdf0, 'name': 'Lecture 0 (final).pdf', 'mime': PDF}]
        drive['sem1xxxxxxxxxxxxxxxxxxxxxxxx'] = []
        new, _ = build(drive)
        y0 = validator.diff(old, new, ROOTS)[ROOTS[0]['category']]
        y1 = validator.diff(old, new, ROOTS)[ROOTS[1]['category']]
        self.assertEqual(y0['counts']['added'], 1)
        self.assertEqual(y0['counts']['moved'], 1)
        self.assertEqual(y0['counts']['renamed'], 1)
        self.assertEqual(y0['renamed'][0]['from'], 'Lecture 0.pdf')
        self.assertEqual(y1['counts']['removed'], 1)


class StaleFolders(unittest.TestCase):
    def test_failed_listing_keeps_previous_subtree(self):
        old, _ = build(fake_drive())
        sem1 = 'sem1xxxxxxxxxxxxxxxxxxxxxxxx'
        new, info = build(fake_drive(), old=old, failing={sem1})
        self.assertEqual({r['id'] for r in new}, {r['id'] for r in old})
        stale = info[ROOTS[1]['category']]['stale']
        self.assertEqual([s['id'] for s in stale], [sem1])
        self.assertEqual(stale[0]['kept'], 1)

    def test_removal_only_when_parent_listed(self):
        old, _ = build(fake_drive())
        drive = fake_drive()
        drive['sem2xxxxxxxxxxxxxxxxxxxxxxxx'] = []  # listing succeeded and the PDF is gone
        new, _ = build(drive, old=old)
        self.assertNotIn('pdf2xxxxxxxxxxxxxxxxxxxxxxxx', {r['id'] for r in new})


class Breaker(unittest.TestCase):
    def test_repeated_failures_stop_fetching_and_keep_old_rows(self):
        semesters = [{'id': f'semester{i:03d}xxxxxxxxxxxxxxxx', 'name': f'S{i}', 'mime': FOLDER} for i in range(40)]
        drive = fake_drive({ROOTS[0]['id']: semesters})
        old, _ = build(drive)
        calls = []

        def lister(folder_id):
            calls.append(folder_id)
            if folder_id == ROOTS[0]['id']:
                return copy.deepcopy(drive[folder_id])
            raise OSError('HTTP Error 429')

        rows, problems, stale = updater.crawl(ROOTS[0]['id'], updater.old_children_index(old), lister, delay=0)
        self.assertEqual({r['id'] for r in rows}, {r['id'] for r in old if r['category'] == ROOTS[0]['category']} - {ROOTS[0]['id']})
        self.assertTrue(any('stopped after repeated Drive failures' in s['reason'] for s in stale))
        self.assertLess(len(calls), 1 + 41 * 2)


class EndToEnd(unittest.TestCase):
    def run_main(self, drive, argv=(), failing=()):
        return updater.main(list(argv), lister=lister_for(drive, failing), catalog_path=self.path, delay=0)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'drive-catalog.json'
        catalog, _ = build(fake_drive())
        self.path.write_text(updater.serialize(catalog), encoding='utf-8')
        self.original = self.path.read_bytes()

    def tearDown(self):
        self.tmp.cleanup()

    def test_unchanged_drive_leaves_file_identical(self):
        report = Path(self.tmp.name) / 'report.json'
        self.assertEqual(self.run_main(fake_drive(), ['--report', str(report)]), 0)
        self.assertEqual(self.path.read_bytes(), self.original)
        data = json.loads(report.read_text(encoding='utf-8'))
        self.assertFalse(data['changed'])
        self.assertFalse(data['wrote'])

    def test_dry_run_never_writes(self):
        drive = fake_drive({'sem0xxxxxxxxxxxxxxxxxxxxxxxx': [{'id': 'addedxxxxxxxxxxxxxxxxxxxxxxx', 'name': 'New.pdf',
                                                             'mime': PDF}]})
        self.assertEqual(self.run_main(drive, ['--dry-run']), 0)
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_real_change_is_written(self):
        drive = fake_drive({'sem0xxxxxxxxxxxxxxxxxxxxxxxx': [{'id': 'addedxxxxxxxxxxxxxxxxxxxxxxx', 'name': 'New.pdf',
                                                             'mime': PDF}]})
        self.assertEqual(self.run_main(drive), 0)
        self.assertIn('addedxxxxxxxxxxxxxxxxxxxxxxx', self.path.read_text(encoding='utf-8'))

    def test_gate_failure_writes_nothing(self):
        report = Path(self.tmp.name) / 'report.json'
        candidate = Path(self.tmp.name) / 'candidate.json'
        # Every listing of the last year fails and there is no previous subtree to keep for its root.
        failing = {ROOTS[2]['id']}
        self.path.write_text(updater.serialize([r for r in json.loads(self.original) if r['category'] != ROOTS[2]['category']
                                                or r['id'] == ROOTS[2]['id']]), encoding='utf-8')
        before = self.path.read_bytes()
        code = self.run_main(fake_drive(), ['--report', str(report), '--candidate', str(candidate)], failing)
        self.assertEqual(code, 2)
        self.assertEqual(self.path.read_bytes(), before)
        self.assertTrue(candidate.exists())
        self.assertIn('empty_year', [g['code'] for g in json.loads(report.read_text(encoding='utf-8'))['gates']])


if __name__ == '__main__':
    unittest.main()
