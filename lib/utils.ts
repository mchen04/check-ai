import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Clamp a value to be within a range [min, max]
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Clamp a value to be within [0, 1] (useful for ratios/percentages)
 */
export function clampRatio(value: number): number {
  return clamp(value, 0, 1);
}
