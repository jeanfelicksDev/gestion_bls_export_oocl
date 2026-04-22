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
  
  const originalStr = val.toString().trim();
  
  // Handle complex amounts with '+' (e.g., 20000USD+700EUR)
  if (originalStr.includes("+")) {
    return originalStr
      .split("+")
      .map(part => formatSingleAmount(part.trim()))
      .join(" + ");
  }

  return formatSingleAmount(originalStr);
}

/**
 * Internal helper to format a single amount segment like "20000USD", "567,45" or "30 000"
 */
function formatSingleAmount(s: string | null | undefined): string {
  if (!s) return "";
  
  // Strip internal spaces for clean parsing
  const clean = s.replace(/\s/g, "");
  
  // Find first non-numeric character (digit, dot, comma) to separate number from currency/text
  const letterIndex = clean.search(/[^0-9,.]/);
  
  let numPart = "";
  let extraPart = "";

  if (letterIndex === -1) {
    numPart = clean;
  } else {
    numPart = clean.substring(0, letterIndex);
    extraPart = clean.substring(letterIndex);
  }

  // Format numeric part
  let formattedNum = "";
  if (numPart && numPart !== "-") {
    // Support both dot and comma as decimal separators
    const hasComma = numPart.includes(",");
    const hasDot = numPart.includes(".");
    const separator = hasComma ? "," : (hasDot ? "." : "");
    
    // Split to find integer and decimal
    const parts = numPart.split(/[.,]/);
    const integerPart = parts[0] || "0";
    const decimalPart = parts[1];

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    formattedNum = decimalPart !== undefined 
      ? `${formattedInteger}${separator}${decimalPart}` 
      : formattedInteger;
  } else if (numPart === "-") {
    formattedNum = "-";
  }

  if (!extraPart) return formattedNum;
  
  // Combine with uppercase currency/text, ensuring at least one space
  const result = `${formattedNum} ${extraPart.toUpperCase()}`.trim();
  return result.replace(/([0-9,.]+)\s*([^0-9,.\s]+)/g, "$1 $2");
}

/**
 * Removes only space characters to preserve numbers and currency codes.
 */
export function unformatAmount(val: string): string {
  return val.replace(/\s/g, "");
}
