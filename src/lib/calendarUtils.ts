
export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY.MM.DD
  startTime: string; // HH:mm
  endTime?: string;  // HH:mm
  durationHours?: number;
}

/**
 * Parses date string like "2026.05.31 (Sun)" and time strings
 * to return Date objects.
 */
export function getEventDates(dateStr: string, startTimeStr: string, endTimeStr?: string, durationHours: number = 3) {
  // Clean dateStr: 2026.05.31 (Sun) -> 2026, 05, 31
  const cleanDate = dateStr.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim();
  const dateParts = cleanDate.split('.');
  
  if (dateParts.length < 2) return null;
  
  let year: number;
  let month: number;
  let day: number;
  
  if (dateParts.length === 3) {
    year = parseInt(dateParts[0]);
    month = parseInt(dateParts[1]) - 1;
    day = parseInt(dateParts[2]);
  } else {
    year = new Date().getFullYear();
    month = parseInt(dateParts[0]) - 1;
    day = parseInt(dateParts[1]);
  }

  // Clean timeStr: 13:00〜 -> 13, 00
  const parseTime = (t: string) => {
    const clean = t.replace(/[〜~-].*$/, '').trim();
    const parts = clean.split(':');
    return {
      hours: parts.length > 0 ? parseInt(parts[0]) : 13,
      minutes: parts.length > 1 ? parseInt(parts[1]) : 0
    };
  };

  const startInfo = parseTime(startTimeStr);
  const start = new Date(year, month, day, startInfo.hours, startInfo.minutes);
  
  let end: Date;
  if (endTimeStr) {
    const endInfo = parseTime(endTimeStr);
    end = new Date(year, month, day, endInfo.hours, endInfo.minutes);
    // If end time is before start time, assume it's the next day
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
  } else {
    end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  }

  return { start, end };
}

function formatDateToICS(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates a Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent) {
  const dates = getEventDates(event.startDate, event.startTime, event.endTime, event.durationHours);
  if (!dates) return '';

  const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const timeRange = `${format(dates.start)}/${format(dates.end)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: timeRange,
    details: event.description,
    location: event.location,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates and triggers a download of an .ics file
 */
export function downloadICS(event: CalendarEvent) {
  const dates = getEventDates(event.startDate, event.startTime, event.endTime, event.durationHours);
  if (!dates) return;

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//rOOM8//NONSGML Event Calendar//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(dates.start)}`,
    `DTEND:${formatDate(dates.end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
