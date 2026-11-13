// Tests that the Electricity Bill page's tariff table is rendered FROM
// src/config/electricity.ts (P1 fix) — never from hard-coded page markup.
// Run: npx tsx tests/electricity-table.test.ts
import assert from 'node:assert/strict';
import {
  LIFELINE_SLABS,
  PROTECTED_SLABS,
  UNPROTECTED_SLABS,
} from '../src/config/electricity';
import { electricityTariffTableRows } from '../src/lib/calc';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// --- Labels: the exact wording the page has shown since launch ---
check('tariff table has 12 rows with the long-standing labels', () => {
  const rows = electricityTariffTableRows();
  assert.deepEqual(
    rows.map((r) => r.label),
    [
      'Up to 50 (lifeline)',
      '51–100 (lifeline)',
      '1–100 (protected)',
      '101–200 (protected)',
      '1–100 (unprotected)',
      '101–200 (unprotected)',
      '201–300',
      '301–400',
      '401–500',
      '501–600',
      '601–700',
      'Above 700',
    ],
  );
});

// --- Values: every row must equal the config slab it came from ---
check('every row rate and fixed charge equals its config slab', () => {
  const rows = electricityTariffTableRows();
  const slabs = [...LIFELINE_SLABS, ...PROTECTED_SLABS, ...UNPROTECTED_SLABS];
  assert.equal(rows.length, slabs.length);
  rows.forEach((row, i) => {
    assert.equal(row.ratePerUnit, slabs[i].ratePerUnit, `row ${i} rate`);
    assert.equal(row.fixedPerKw, slabs[i].fixedPerKw, `row ${i} fixed`);
  });
});

check('lifeline rows carry no fixed charge, top unprotected rate is Rs 47.20', () => {
  const rows = electricityTariffTableRows();
  assert.equal(rows[0].fixedPerKw, 0);
  assert.equal(rows[1].fixedPerKw, 0);
  assert.equal(rows[11].ratePerUnit, 47.2);
  assert.equal(rows[11].fixedPerKw, 675);
});

check('rates rise monotonically within each category', () => {
  const rows = electricityTariffTableRows();
  const groups = [rows.slice(0, 2), rows.slice(2, 4), rows.slice(4, 12)];
  for (const group of groups) {
    for (let i = 1; i < group.length; i++) {
      assert.ok(group[i].ratePerUnit > group[i - 1].ratePerUnit);
    }
  }
});

console.log(`\n${passed} checks passed.`);
