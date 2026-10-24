import { PARAMS } from "./data";

/**
 * Fare model (ESTIMATE — labelled throughout the UI):
 * Rs 10 base + Rs 2 per station travelled, capped at Rs 35.
 * Transfers are included; no zonal logic in the demo dataset.
 */
export function fareForHops(hops: number): number {
  const h = Math.max(0, Math.round(hops));
  if (h === 0) return 0;
  return Math.min(PARAMS.fareCap, PARAMS.baseFare + PARAMS.perStationFare * h);
}

export function inr(n: number): string {
  return `₹${n}`;
}
