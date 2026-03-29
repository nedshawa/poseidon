/**
 * cron-parser.ts — Zero-dependency 5-field POSIX cron parser.
 *
 * Supports: *, comma, dash, slash operators, named months/days, aliases.
 * Does NOT support seconds (6-field) — minute granularity only.
 */

// ── Aliases ─────────────────────────────────────────────────

const ALIASES: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

// Named values
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const DAYS: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

interface CronField {
  values: Set<number>;
}

interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
  isReboot: boolean;
}

// ── Field Ranges ────────────────────────────────────────────

const RANGES: [number, number][] = [
  [0, 59],  // minute
  [0, 23],  // hour
  [1, 31],  // day of month
  [1, 12],  // month
  [0, 7],   // day of week (0 and 7 = Sunday)
];

// ── Parsing ─────────────────────────────────────────────────

function replaceNames(field: string, fieldIndex: number): string {
  let result = field.toLowerCase();
  if (fieldIndex === 3) {
    for (const [name, val] of Object.entries(MONTHS)) {
      result = result.replace(new RegExp(name, "gi"), String(val));
    }
  }
  if (fieldIndex === 4) {
    for (const [name, val] of Object.entries(DAYS)) {
      result = result.replace(new RegExp(name, "gi"), String(val));
    }
  }
  return result;
}

function parseField(field: string, min: number, max: number): CronField {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    let range: string;
    let step = 1;

    if (stepMatch) {
      range = stepMatch[1];
      step = parseInt(stepMatch[2]);
      if (step < 1) throw new Error(`Invalid step: ${step}`);
    } else {
      range = part;
    }

    if (range === "*") {
      for (let i = min; i <= max; i += step) values.add(i);
    } else if (range.includes("-")) {
      const [startStr, endStr] = range.split("-");
      const start = parseInt(startStr);
      const end = parseInt(endStr);
      if (isNaN(start) || isNaN(end)) throw new Error(`Invalid range: ${range}`);
      if (start < min || end > max) throw new Error(`Range ${start}-${end} out of bounds [${min}-${max}]`);
      for (let i = start; i <= end; i += step) values.add(i);
    } else {
      const val = parseInt(range);
      if (isNaN(val)) throw new Error(`Invalid value: ${range}`);
      if (val < min || val > max) throw new Error(`Value ${val} out of bounds [${min}-${max}]`);
      values.add(val);
    }
  }

  return { values };
}

/** Parse a cron expression string into a structured representation */
export function parseCron(expression: string): ParsedCron {
  const trimmed = expression.trim();

  if (trimmed === "@reboot") {
    return {
      minute: { values: new Set() },
      hour: { values: new Set() },
      dayOfMonth: { values: new Set() },
      month: { values: new Set() },
      dayOfWeek: { values: new Set() },
      isReboot: true,
    };
  }

  const resolved = ALIASES[trimmed] || trimmed;
  const fields = resolved.split(/\s+/);

  if (fields.length !== 5) {
    throw new Error(`Expected 5 fields, got ${fields.length}: "${expression}"`);
  }

  const namedFields = fields.map((f, i) => replaceNames(f, i));

  return {
    minute: parseField(namedFields[0], ...RANGES[0]),
    hour: parseField(namedFields[1], ...RANGES[1]),
    dayOfMonth: parseField(namedFields[2], ...RANGES[2]),
    month: parseField(namedFields[3], ...RANGES[3]),
    dayOfWeek: parseField(namedFields[4], ...RANGES[4]),
    isReboot: false,
  };
}

/** Validate a cron expression. Returns null if valid, error message if not. */
export function validateCron(expression: string): string | null {
  try {
    parseCron(expression);
    return null;
  } catch (e: any) {
    return e.message || "Invalid cron expression";
  }
}

/** Check if a cron expression matches a given date */
export function cronMatches(expression: string, date: Date, timezone?: string): boolean {
  const parsed = parseCron(expression);
  if (parsed.isReboot) return false; // @reboot only fires on daemon start

  // Convert date to target timezone
  const d = timezone && timezone !== "UTC"
    ? new Date(date.toLocaleString("en-US", { timeZone: timezone }))
    : date;

  const minute = d.getMinutes();
  const hour = d.getHours();
  const dayOfMonth = d.getDate();
  const month = d.getMonth() + 1;
  const dayOfWeek = d.getDay(); // 0 = Sunday

  if (!parsed.minute.values.has(minute)) return false;
  if (!parsed.hour.values.has(hour)) return false;
  if (!parsed.month.values.has(month)) return false;

  // Day matching: if both dom and dow are restricted (not *), match either
  const domAll = parsed.dayOfMonth.values.size === 31;
  const dowAll = parsed.dayOfWeek.values.size >= 7;

  if (domAll && dowAll) return true;
  if (domAll) return parsed.dayOfWeek.values.has(dayOfWeek) || parsed.dayOfWeek.values.has(dayOfWeek === 0 ? 7 : -1);
  if (dowAll) return parsed.dayOfMonth.values.has(dayOfMonth);

  // Both restricted — OR logic (POSIX standard)
  const dowMatch = parsed.dayOfWeek.values.has(dayOfWeek) ||
    (dayOfWeek === 0 && parsed.dayOfWeek.values.has(7));
  return parsed.dayOfMonth.values.has(dayOfMonth) || dowMatch;
}

/** Compute the next fire time from a cron expression */
export function nextFire(expression: string, from: Date = new Date(), timezone?: string): Date | null {
  const parsed = parseCron(expression);
  if (parsed.isReboot) return null;

  // Start from next minute
  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Search up to 366 days ahead
  const maxIterations = 366 * 24 * 60;
  for (let i = 0; i < maxIterations; i++) {
    if (cronMatches(expression, candidate, timezone)) {
      return candidate;
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null; // No match in next year
}

/**
 * Convert a cron expression to systemd OnCalendar format.
 * Cron: minute hour dom month dow
 * systemd: DayOfWeek Year-Month-Day Hour:Minute:Second
 */
export function cronToOnCalendar(expression: string): string {
  const trimmed = expression.trim();
  if (ALIASES[trimmed]) return cronToOnCalendar(ALIASES[trimmed]);
  if (trimmed === "@reboot") return ""; // Handled separately

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) throw new Error(`Invalid cron: ${expression}`);

  const [minute, hour, dom, month, dow] = fields;

  // Convert dow from cron (0-7, 0/7=Sun) to systemd (Mon,Tue,...)
  const systemdDays: Record<string, string> = {
    "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed",
    "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun",
  };

  let dowPart = "";
  if (dow !== "*") {
    const dayParts: string[] = [];
    for (const d of expandField(dow, 0, 7)) {
      dayParts.push(systemdDays[String(d)] || `${d}`);
    }
    dowPart = [...new Set(dayParts)].join(",") + " ";
  }

  const monthPart = month === "*" ? "*" : month.replace(/,/g, ",");
  const domPart = dom === "*" ? "*" : dom;
  const hourPart = hour === "*" ? "*" : hour.padStart(2, "0");
  const minutePart = minute === "*" ? "*" : minute.padStart(2, "0");

  return `${dowPart}*-${monthPart}-${domPart} ${hourPart}:${minutePart}:00`;
}

function expandField(field: string, min: number, max: number): number[] {
  const parsed = parseField(replaceNames(field, 4), min, max);
  return [...parsed.values].sort((a, b) => a - b);
}
