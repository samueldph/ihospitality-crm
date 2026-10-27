import { ScheduleCalendar } from '@/components/ScheduleCalendar';

export const dynamic = 'force-dynamic';

export default function CalendarPage() {
  return (
    <section>
      <h1 style={{ marginBottom: 12 }}>Calendar</h1>
      <ScheduleCalendar />
    </section>
  );
}
