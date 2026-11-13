// Tests for the expiry / re-verification tripwires (P0-2).
// Run: npx tsx tests/review-dates.test.ts
// All "today" values are INJECTED — no assertion depends on the real clock.
import assert from 'node:assert/strict';
import { TAX_NEXT_REVIEW } from '../src/config/tax';
import { ELECTRICITY_LAST_CHECKED, ELECTRICITY_NEXT_REVIEW } from '../src/config/electricity';
import { GAS_LAST_CHECKED, GAS_NEXT_REVIEW } from '../src/config/gas';
import { FREELANCER_LAST_CHECKED, FREELANCER_NEXT_REVIEW } from '../src/config/freelancer-tax';
import { PENSION_LAST_CHECKED, PENSION_NEXT_REVIEW } from '../src/config/pension';
import { NATIONAL_SAVINGS_LAST_CHECKED, NATIONAL_SAVINGS_NEXT_REVIEW } from '../src/config/national-savings';
import { GST_LAST_CHECKED, GST_NEXT_REVIEW } from '../src/config/gst';
import { CAR_LOAN_LAST_CHECKED, CAR_LOAN_NEXT_REVIEW } from '../src/config/car-loan';
import { HOME_LOAN_LAST_CHECKED, HOME_LOAN_NEXT_REVIEW } from '../src/config/home-loan';
import { isReviewDue, isValidIsoDate, reviewStatuses } from '../src/lib/review-dates';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// --- Constants are valid ISO dates ---
check('TAX_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(TAX_NEXT_REVIEW), true);
});
check('ELECTRICITY_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(ELECTRICITY_NEXT_REVIEW), true);
});
check('GAS_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(GAS_NEXT_REVIEW), true);
});
check('FREELANCER_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(FREELANCER_NEXT_REVIEW), true);
});
check('PENSION_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(PENSION_NEXT_REVIEW), true);
});
check('NATIONAL_SAVINGS_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(NATIONAL_SAVINGS_NEXT_REVIEW), true);
});
check('GST_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(GST_NEXT_REVIEW), true);
});
check('CAR_LOAN_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(CAR_LOAN_NEXT_REVIEW), true);
});
check('HOME_LOAN_NEXT_REVIEW is a valid ISO date', () => {
  assert.equal(isValidIsoDate(HOME_LOAN_NEXT_REVIEW), true);
});
check('isValidIsoDate rejects bad dates', () => {
  assert.equal(isValidIsoDate('2027-13-01'), false); // month 13
  assert.equal(isValidIsoDate('2027-02-30'), false); // no such day
  assert.equal(isValidIsoDate('1 May 2027'), false); // not ISO form
  assert.equal(isValidIsoDate(''), false);
});

// --- Tax review must fall before the tax year ends (30 Jun 2027) ---
check('tax review date is before 2027-06-30', () => {
  assert.ok(TAX_NEXT_REVIEW < '2027-06-30', `expected ${TAX_NEXT_REVIEW} < 2027-06-30`);
});
check('tax review date is the expected value', () => {
  assert.equal(TAX_NEXT_REVIEW, '2027-05-01');
});

// --- Electricity review must fall after the last check (8 Nov 2026) ---
check('electricity review date is after ELECTRICITY_LAST_CHECKED', () => {
  const lastChecked = new Date(ELECTRICITY_LAST_CHECKED);
  const review = new Date(`${ELECTRICITY_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${ELECTRICITY_NEXT_REVIEW} after ${ELECTRICITY_LAST_CHECKED}`);
});
check('electricity review date is the expected value', () => {
  assert.equal(ELECTRICITY_NEXT_REVIEW, '2027-02-08');
});

// --- Gas review must fall after the last check (13 Nov 2026) and
// --- before the next winter (November 2027) ---
check('gas review date is after GAS_LAST_CHECKED', () => {
  const lastChecked = new Date(GAS_LAST_CHECKED);
  const review = new Date(`${GAS_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${GAS_NEXT_REVIEW} after ${GAS_LAST_CHECKED}`);
});
check('gas review date is before winter 2027 (1 November 2027)', () => {
  assert.ok(GAS_NEXT_REVIEW < '2027-11-01', `expected ${GAS_NEXT_REVIEW} < 2027-11-01`);
});
check('gas review date is the expected value', () => {
  assert.equal(GAS_NEXT_REVIEW, '2027-10-01');
});

// --- Freelancer review must fall after the last check (13 Nov 2026)
// --- and before the tax year ends (30 Jun 2027) ---
check('freelancer review date is after FREELANCER_LAST_CHECKED', () => {
  const lastChecked = new Date(FREELANCER_LAST_CHECKED);
  const review = new Date(`${FREELANCER_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${FREELANCER_NEXT_REVIEW} after ${FREELANCER_LAST_CHECKED}`);
});
check('freelancer review date is before 2027-06-30', () => {
  assert.ok(FREELANCER_NEXT_REVIEW < '2027-06-30', `expected ${FREELANCER_NEXT_REVIEW} < 2027-06-30`);
});
check('freelancer review date is the expected value', () => {
  assert.equal(FREELANCER_NEXT_REVIEW, '2027-05-01');
});

// --- Pension review must fall after the last check (13 Nov 2026)
// --- and before the next July minimum-wage revision ---
check('pension review date is after PENSION_LAST_CHECKED', () => {
  const lastChecked = new Date(PENSION_LAST_CHECKED);
  const review = new Date(`${PENSION_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${PENSION_NEXT_REVIEW} after ${PENSION_LAST_CHECKED}`);
});
check('pension review date is before 2027-07-01', () => {
  assert.ok(PENSION_NEXT_REVIEW < '2027-07-01', `expected ${PENSION_NEXT_REVIEW} < 2027-07-01`);
});
check('pension review date is the expected value', () => {
  assert.equal(PENSION_NEXT_REVIEW, '2027-02-01');
});

// --- National Savings review must fall after the last check
// --- (13 Nov 2026) and within 2 months — CDNS revises frequently ---
check('national-savings review date is after NATIONAL_SAVINGS_LAST_CHECKED', () => {
  const lastChecked = new Date(NATIONAL_SAVINGS_LAST_CHECKED);
  const review = new Date(`${NATIONAL_SAVINGS_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${NATIONAL_SAVINGS_NEXT_REVIEW} after ${NATIONAL_SAVINGS_LAST_CHECKED}`);
});
check('national-savings review date is within 2 months of the last check', () => {
  assert.ok(NATIONAL_SAVINGS_NEXT_REVIEW <= '2027-01-13', `expected ${NATIONAL_SAVINGS_NEXT_REVIEW} <= 2027-01-13`);
});
check('national-savings review date is the expected value', () => {
  assert.equal(NATIONAL_SAVINGS_NEXT_REVIEW, '2027-01-13');
});

// --- GST review must fall after the last check (13 Nov 2026) and
// --- before the tax year ends (30 Jun 2027), ahead of Finance Act 2027 ---
check('gst review date is after GST_LAST_CHECKED', () => {
  const lastChecked = new Date(GST_LAST_CHECKED);
  const review = new Date(`${GST_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${GST_NEXT_REVIEW} after ${GST_LAST_CHECKED}`);
});
check('gst review date is before 2027-06-30', () => {
  assert.ok(GST_NEXT_REVIEW < '2027-06-30', `expected ${GST_NEXT_REVIEW} < 2027-06-30`);
});
check('gst review date is the expected value', () => {
  assert.equal(GST_NEXT_REVIEW, '2027-05-01');
});

// --- Car-loan and home-loan reviews: 3 months after the last check
// --- (13 Nov 2026) — rates move with KIBOR, so both re-verify by
// --- 13 Feb 2027 ---
check('car-loan review date is after CAR_LOAN_LAST_CHECKED', () => {
  const lastChecked = new Date(CAR_LOAN_LAST_CHECKED);
  const review = new Date(`${CAR_LOAN_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${CAR_LOAN_NEXT_REVIEW} after ${CAR_LOAN_LAST_CHECKED}`);
});
check('car-loan review date is the expected value', () => {
  assert.equal(CAR_LOAN_NEXT_REVIEW, '2027-02-13');
});
check('home-loan review date is after HOME_LOAN_LAST_CHECKED', () => {
  const lastChecked = new Date(HOME_LOAN_LAST_CHECKED);
  const review = new Date(`${HOME_LOAN_NEXT_REVIEW}T00:00:00Z`);
  assert.ok(review > lastChecked, `expected ${HOME_LOAN_NEXT_REVIEW} after ${HOME_LOAN_LAST_CHECKED}`);
});
check('home-loan review date is the expected value', () => {
  assert.equal(HOME_LOAN_NEXT_REVIEW, '2027-02-13');
});

// --- Due / not-yet-due flag logic, with injected "today" dates ---
check('isReviewDue: day before review is not due', () => {
  assert.equal(isReviewDue('2027-05-01', '2027-04-30'), false);
});
check('isReviewDue: review day itself is due', () => {
  assert.equal(isReviewDue('2027-05-01', '2027-05-01'), true);
});
check('isReviewDue: day after review is overdue', () => {
  assert.equal(isReviewDue('2027-05-01', '2027-05-02'), true);
});
check('isReviewDue: far past date is not due', () => {
  assert.equal(isReviewDue('2027-02-08', '2026-11-13'), false);
});
check('reviewStatuses: nothing due before any review date', () => {
  const s = reviewStatuses('2027-01-12');
  assert.deepEqual(s, [
    { name: 'tax', reviewDate: '2027-05-01', due: false },
    { name: 'electricity', reviewDate: '2027-02-08', due: false },
    { name: 'gas', reviewDate: '2027-10-01', due: false },
    { name: 'freelancer', reviewDate: '2027-05-01', due: false },
    { name: 'solar', reviewDate: '2027-02-13', due: false },
    { name: 'pension', reviewDate: '2027-02-01', due: false },
    { name: 'national-savings', reviewDate: '2027-01-13', due: false },
    { name: 'gst', reviewDate: '2027-05-01', due: false },
    { name: 'car-loan', reviewDate: '2027-02-13', due: false },
    { name: 'home-loan', reviewDate: '2027-02-13', due: false },
  ]);
});
check('reviewStatuses: electricity due, tax and gas not yet due', () => {
  const s = reviewStatuses('2027-02-08');
  assert.deepEqual(s, [
    { name: 'tax', reviewDate: '2027-05-01', due: false },
    { name: 'electricity', reviewDate: '2027-02-08', due: true },
    { name: 'gas', reviewDate: '2027-10-01', due: false },
    { name: 'freelancer', reviewDate: '2027-05-01', due: false },
    { name: 'solar', reviewDate: '2027-02-13', due: false },
    { name: 'pension', reviewDate: '2027-02-01', due: true },
    { name: 'national-savings', reviewDate: '2027-01-13', due: true },
    { name: 'gst', reviewDate: '2027-05-01', due: false },
    { name: 'car-loan', reviewDate: '2027-02-13', due: false },
    { name: 'home-loan', reviewDate: '2027-02-13', due: false },
  ]);
});
check('reviewStatuses: all due after the latest review date', () => {
  const s = reviewStatuses('2027-10-01');
  assert.deepEqual(s, [
    { name: 'tax', reviewDate: '2027-05-01', due: true },
    { name: 'electricity', reviewDate: '2027-02-08', due: true },
    { name: 'gas', reviewDate: '2027-10-01', due: true },
    { name: 'freelancer', reviewDate: '2027-05-01', due: true },
    { name: 'solar', reviewDate: '2027-02-13', due: true },
    { name: 'pension', reviewDate: '2027-02-01', due: true },
    { name: 'national-savings', reviewDate: '2027-01-13', due: true },
    { name: 'gst', reviewDate: '2027-05-01', due: true },
    { name: 'car-loan', reviewDate: '2027-02-13', due: true },
    { name: 'home-loan', reviewDate: '2027-02-13', due: true },
  ]);
});

console.log(`\n${passed} review-date checks passed`);
