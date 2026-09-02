import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose class names, with later Tailwind utilities beating earlier ones.
 *
 * `clsx` handles conditionals; `twMerge` resolves conflicts, so a caller can
 * override a component's default (`cn("px-4", "px-2")` → `px-2`) instead of
 * both landing and the cascade deciding.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
