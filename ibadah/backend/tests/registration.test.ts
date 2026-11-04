import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validBirthDate } from '../src/registration.js';

test('tanggal lahir harus tanggal kalender yang valid dan bukan di masa depan', () => {
  assert.equal(validBirthDate('2000-02-29', '2026-11-04'), true);
  assert.equal(validBirthDate('2023-02-29', '2026-11-04'), false);
  assert.equal(validBirthDate('2026-11-05', '2026-11-04'), false);
  assert.equal(validBirthDate('', '2026-11-04'), false);
});
