export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: getUserTimeZone()
  });
}

export function getISODateWithLocalTime(dateInput: string): string {
  const [year, month, day] = dateInput.split('-').map(Number);
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const localDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
  return localDateTime.toISOString();
}

export function formatDateFromUTC(utcDateString: string): string {
  const date = new Date(utcDateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export interface MonthBounds {
  start: Date;
  end: Date;
}

export function getMonthBounds(date: Date, startDate: number): MonthBounds {
  const year = date.getFullYear();
  const month = date.getMonth();

  let startMonth = month;
  let startYear = year;

  if (date.getDate() < startDate) {
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  const start = new Date(startYear, startMonth, startDate, 0, 0, 0);

  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }

  const end = new Date(endYear, endMonth, startDate, 0, 0, 0);

  return { start, end };
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateForInput(date: Date): string {
  return getDateString(date);
}
