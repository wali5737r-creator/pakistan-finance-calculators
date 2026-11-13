// Review-date tripwire helpers — pure date logic with NO clock
// dependency. The caller injects "today" as an ISO date string, so
// tests never depend on the real date and the check is deterministic.
import { TAX_NEXT_REVIEW } from '../config/tax';
import { ELECTRICITY_NEXT_REVIEW } from '../config/electricity';
import { GAS_NEXT_REVIEW } from '../config/gas';
import { FREELANCER_NEXT_REVIEW } from '../config/freelancer-tax';

/** True only for a real calendar date in strict YYYY-MM-DD form. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * True when `today` is on or after the review date — i.e. the review is
 * due (or overdue). ISO dates sort lexicographically, so a plain string
 * comparison is exact. The review date itself counts as due: the work
 * must be done by that day, not after it.
 */
export function isReviewDue(reviewDate: string, today: string): boolean {
  return today >= reviewDate;
}

export interface ReviewStatus {
  /** Which config the review belongs to: 'tax' | 'electricity' | 'gas' | 'freelancer'. */
  name: 'tax' | 'electricity' | 'gas' | 'freelancer';
  reviewDate: string;
  /** True when `today` is on or after reviewDate. */
  due: boolean;
}

/** Due/overdue status of all four review tripwires for an injected `today`. */
export function reviewStatuses(today: string): ReviewStatus[] {
  return [
    { name: 'tax', reviewDate: TAX_NEXT_REVIEW, due: isReviewDue(TAX_NEXT_REVIEW, today) },
    { name: 'electricity', reviewDate: ELECTRICITY_NEXT_REVIEW, due: isReviewDue(ELECTRICITY_NEXT_REVIEW, today) },
    { name: 'gas', reviewDate: GAS_NEXT_REVIEW, due: isReviewDue(GAS_NEXT_REVIEW, today) },
    { name: 'freelancer', reviewDate: FREELANCER_NEXT_REVIEW, due: isReviewDue(FREELANCER_NEXT_REVIEW, today) },
  ];
}
