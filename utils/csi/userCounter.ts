import fs from 'node:fs';
import path from 'node:path';

const USER_COUNTER_PATH = path.resolve(__dirname, '../../storage/userCounter.json');

type UserCounterFile = {
  lastUserNumber: number;
};

export function readLastUserNumber(): number {
  const raw = fs.readFileSync(USER_COUNTER_PATH, 'utf8');
  const parsed = JSON.parse(raw) as UserCounterFile;
  if (typeof parsed.lastUserNumber !== 'number' || !Number.isFinite(parsed.lastUserNumber)) {
    throw new Error(`Invalid lastUserNumber in ${USER_COUNTER_PATH}`);
  }
  return parsed.lastUserNumber;
}

export function writeLastUserNumber(value: number): void {
  const payload: UserCounterFile = { lastUserNumber: value };
  fs.writeFileSync(USER_COUNTER_PATH, `${JSON.stringify(payload, null, 4)}\n`, 'utf8');
}
