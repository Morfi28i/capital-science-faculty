#!/usr/bin/env python3
"""Build the small JSON body the Drive sync workflow posts to POST /api/sync/report.

Usage: python3 scripts/sync-report-payload.py [REPORT_PATH] > payload.json

Reads the full report written by update-drive-catalog.py (if it exists), trims every list so the body
stays small, and adds the workflow outcome from these environment variables:
  SYNC_STATUS     paused | skipped | success | failure   (required)
  COMMIT_SHA      the pushed sync commit, if any
  GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_EVENT_NAME
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

LIST_LIMIT = 50
BUCKETS = ('added', 'removed', 'renamed', 'moved', 'changed', 'stale', 'problems')


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else 'sync-report.json')
    report = {}
    if path.exists():
        try:
            report = json.loads(path.read_text(encoding='utf-8'))
        except ValueError:
            report = {}
    run_id = os.environ.get('GITHUB_RUN_ID')
    attempt = os.environ.get('GITHUB_RUN_ATTEMPT', '1')
    server, repo = os.environ.get('GITHUB_SERVER_URL'), os.environ.get('GITHUB_REPOSITORY')
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    payload = {
        'schemaVersion': 1,
        'runId': report.get('runId') or (f'{run_id}-{attempt}' if run_id else f'local-{now}'),
        'runUrl': report.get('runUrl') or (f'{server}/{repo}/actions/runs/{run_id}' if run_id and server and repo else None),
        'trigger': report.get('trigger') or os.environ.get('GITHUB_EVENT_NAME') or 'local',
        'status': os.environ.get('SYNC_STATUS', 'failure'),
        'mode': report.get('mode') or ('dry-run' if os.environ.get('DRY_RUN') == 'true' else 'write'),
        'startedAt': report.get('startedAt') or now,
        'finishedAt': report.get('finishedAt') or now,
        'durationSec': report.get('durationSec', 0),
        'ok': bool(report.get('ok', False)),
        'changed': bool(report.get('changed', False)),
        'wrote': bool(report.get('wrote', False)),
        'commit': os.environ.get('COMMIT_SHA') or None,
        'rows': report.get('rows') or {},
        'totals': report.get('totals') or {},
        'gates': (report.get('gates') or [])[:20],
        'years': {},
    }
    for category, year in (report.get('years') or {}).items():
        payload['years'][category] = {
            'before': year.get('before', 0),
            'after': year.get('after', 0),
            'counts': year.get('counts') or {},
            **{name: (year.get(name) or [])[:LIST_LIMIT] for name in BUCKETS},
        }
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == '__main__':
    main()
