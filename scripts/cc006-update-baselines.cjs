/**
 * CC-006: refresh logo snapshots (--update-snapshots) and theme JSON (SB057_UPDATE_THEME) for Org A and Org B.
 * Playwright does not accept custom CLI flags such as --update-theme.
 */
process.env.SB057_UPDATE_THEME = '1';

const { spawnSync } = require('node:child_process');

const result = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    'tests/csi/CrossCutting/CrossCutting.spec.ts',
    '--grep',
    'CC-006',
    '--update-snapshots',
  ],
  { stdio: 'inherit', env: process.env, shell: true },
);

process.exit(result.status ?? 1);
