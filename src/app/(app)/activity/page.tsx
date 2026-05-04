import { loadEvents } from '@/lib/events';
import ActivityList from './ActivityList';

export const revalidate = 30;

export default async function ActivityPage() {
  const events = await loadEvents(200);
  return <ActivityList events={events} />;
}
