import type { Event, EventStore } from '@/shared/types';

// Create an in-memory event store
export const createInMemoryEventStore = (): EventStore => {
  // Each instance gets its own events map
  const events: Map<string, Event[]> = new Map<string, Event[]>();

  const getEvents = async (aggregateId: string): Promise<Event[]> => {
    return events.get(aggregateId) || [];
  };

  const getAllEvents = async (): Promise<Event[]> => {
    const allEvents: Event[] = [];
    for (const eventList of events.values()) {
      allEvents.push(...eventList);
    }
    return allEvents.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  };

  const saveEvents = async (
    aggregateId: string,
    eventsToSave: Event[],
    expectedVersion: number
  ): Promise<void> => {
    const existingEvents = events.get(aggregateId) || [];

    if (existingEvents.length !== expectedVersion) {
      throw new Error(
        `Concurrency conflict. Expected version ${expectedVersion}, but found ${existingEvents.length}`
      );
    }

    const updatedEvents = [...existingEvents, ...eventsToSave];
    events.set(aggregateId, updatedEvents);
  };

  return {
    saveEvents,
    getEvents,
    getAllEvents,
  };
};
