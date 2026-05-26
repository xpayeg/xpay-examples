import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes — same helper shadcn-ui uses. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
