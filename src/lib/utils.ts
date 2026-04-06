import { parseISO, isWeekend, addDays, isSameDay } from "date-fns";

// Fixed list of public holidays (example for 2026/general Ivorian context)
const PUBLIC_HOLIDAYS = [
  "2026-01-01", // New Year
  "2026-04-06", // Easter Monday
  "2026-05-01", // Labor day
  "2026-05-14", // Ascension
  "2026-05-25", // Whit Monday
  "2026-08-07", // Independence Day
  "2026-08-15", // Assumption
  "2026-11-01", // All Saints
  "2026-11-15", // Peace Day
  "2026-12-25", // Christmas
];

/**
 * Calculates working days between two dates.
 * If dateRetrait is not set, it uses now() if ETD is passed.
 */
export function calculateWorkingDays(etd: Date | string | null, dateRetrait: Date | string | null): number | null {
  if (!etd) return null;
  
  let startDate = typeof etd === "string" ? parseISO(etd) : etd;
  const endDate = dateRetrait 
    ? (typeof dateRetrait === "string" ? parseISO(dateRetrait) : dateRetrait)
    : new Date();

  if (endDate < startDate) return 0;

  let count = 0;
  let cur = new Date(startDate);
  
  // We exclude the start date usually in "ageing", or include it? 
  // differenceInBusinessDays(endDate, startDate) returns full days passed.
  // Let's iterate until endDate
  while (cur < endDate) {
    cur = addDays(cur, 1);
    if (cur > endDate) break;

    const isHoli = PUBLIC_HOLIDAYS.some(h => isSameDay(parseISO(h), cur));
    if (!isWeekend(cur) && !isHoli) {
      count++;
    }
  }

  return count;
}

/**
 * Formats a number or string with thousands separators (spaces).
 * Ex: "1000000" -> "1 000 000"
 * Ex: "1000000XOF" -> "1 000 000 XOF"
 */
export function formatAmount(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  
  // Strip all spaces first to work with clean string
  const s = val.toString().replace(/\s/g, "");
  
  // Match numeric part and currency part (letters)
  const match = s.match(/^(\d+)?([a-zA-Z]+)?$/);
  if (!match) return s; // Fallback to raw string if complex

  const numPart = match[1] || "";
  const currencyPart = match[2] || "";

  // Format numeric part with spaces
  const formattedNum = numPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  if (!currencyPart) return formattedNum;
  
  // Combine with uppercase currency
  return `${formattedNum} ${currencyPart.toUpperCase()}`.trim();
}

/**
 * Removes only space characters to preserve numbers and currency codes.
 */
export function unformatAmount(val: string): string {
  return val.replace(/\s/g, "");
}
