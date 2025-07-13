/**
 * Event Store Persistence Test Suite
 *
 * This test suite covers the persistence mechanics of the Event Store.
 * It verifies storage, retrieval, and concurrency/versioning logic for events.
 *
 * For event validation and processing logic, see EventStore.event-handling.test.ts.
 */

import { v4 as uuidv4 } from 'uuid';
import { createInMemoryEventStore } from '@/infrastructure/InMemoryEventStore';

describe('InMemoryEventStore', () => {
  it('should store and retrieve events for a single aggregate', async () => {
    // This test verifies that events saved for a specific aggregate (e.g., an account)
    // can be retrieved accurately, ensuring event sourcing state reconstruction works.
    const eventStore = createInMemoryEventStore();
    const aggregateId = 'account-1';
    const event = {
      eventId: uuidv4(),
      aggregateId,
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(),
      version: 1,
    };

    // Save the event to the store for the aggregate
    await eventStore.saveEvents(aggregateId, [event], 0);
    // Retrieve events for the same aggregate
    const events = await eventStore.getEvents(aggregateId);

    // The retrieved events should match what was saved, confirming persistence
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(event);
  });

  it('should isolate events between different aggregates', async () => {
    // This test ensures that events for one aggregate do not affect another,
    // which is critical for multi-tenant or multi-entity systems.
    const eventStore = createInMemoryEventStore();
    const eventA = {
      eventId: uuidv4(),
      aggregateId: 'A',
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(),
      version: 1,
    };
    const eventB = {
      eventId: uuidv4(),
      aggregateId: 'B',
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(),
      version: 1,
    };

    // Save events for two different aggregates
    await eventStore.saveEvents('A', [eventA], 0);
    await eventStore.saveEvents('B', [eventB], 0);

    // Each aggregate should only retrieve its own events
    expect(await eventStore.getEvents('A')).toEqual([eventA]);
    expect(await eventStore.getEvents('B')).toEqual([eventB]);
  });

  it('should retrieve all events across all aggregates, sorted by timestamp', async () => {
    // This test checks that the event store can return a global event stream,
    // which is useful for projections, auditing, or rebuilding read models.
    const eventStore = createInMemoryEventStore();
    const now = new Date();
    const event1 = {
      eventId: uuidv4(),
      aggregateId: 'A',
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(now.getTime()),
      version: 1,
    };
    const event2 = {
      eventId: uuidv4(),
      aggregateId: 'B',
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(now.getTime() + 1000),
      version: 1,
    };
    const event3 = {
      eventId: uuidv4(),
      aggregateId: 'A',
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(now.getTime() + 2000),
      version: 2,
    };

    // Save events for different aggregates
    await eventStore.saveEvents('A', [event1], 0);
    await eventStore.saveEvents('B', [event2], 0);
    await eventStore.saveEvents('A', [event3], 1);

    // Retrieve all events and verify they are sorted by timestamp
    const allEvents = await eventStore.getAllEvents();
    expect(allEvents).toEqual([event1, event2, event3]);
  });

  it('should throw an error if version conflict is detected', async () => {
    // This test simulates a concurrency conflict, which is a key part of event sourcing.
    // If the expected version does not match the actual, the store should reject the save.
    const eventStore = createInMemoryEventStore();
    const aggregateId = 'account-1';
    const event1 = {
      eventId: uuidv4(),
      aggregateId,
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(),
      version: 1,
    };
    const event2 = {
      eventId: uuidv4(),
      aggregateId,
      eventType: 'TestEvent',
      eventData: {},
      timestamp: new Date(),
      version: 2,
    };

    // Save the first event with expected version 0
    await eventStore.saveEvents(aggregateId, [event1], 0);
    // Attempt to save the second event with an incorrect expected version (should be 1)
    await expect(
      eventStore.saveEvents(aggregateId, [event2], 0)
    ).rejects.toThrow('Concurrency conflict');
  });
});
