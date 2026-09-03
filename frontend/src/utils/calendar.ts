import { format } from 'date-fns';

interface CalendarEventDetails {
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

export function generateGoogleCalendarUrl({
  title,
  description,
  location,
  startTime,
  endTime,
}: CalendarEventDetails): string {
  const formatUtc = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/-|:|\.\d+/g, '');
  };

  const startUtc = formatUtc(startTime);
  const endUtc = formatUtc(endTime);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location: location,
    dates: `${startUtc}/${endUtc}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile({
  title,
  description,
  location,
  startTime,
  endTime,
}: CalendarEventDetails) {
  const formatUtc = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/-|:|\.\d+/g, '');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DeskFree//Library Seat Reservation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    `DTSTART:${formatUtc(startTime)}`,
    `DTEND:${formatUtc(endTime)}`,
    `DTSTAMP:${formatUtc(new Date().toISOString())}`,
    `UID:deskfree-${Date.now()}@deskfree.com`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `deskfree-reservation-${format(new Date(startTime), 'yyyyMMdd-HHmm')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
