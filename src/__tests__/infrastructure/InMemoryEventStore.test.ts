import { v4 as uuidv4 } from 'uuid';
import { createInMemoryEventStore } from '@/infrastructure/InMemoryEventStore';
import type { Event } from '@/shared/types';

// Create a mock event
const createMockEvent = (
  aggregateId: string,
  eventType: string,
  version: number
): Event => ({
  eventId: uuidv4(),
  aggregateId,
  eventType,
  eventData: { test: 'data' },
  timestamp: new Date(),
  version,
});

// Create test events
const createTestEvents = (count: number, aggregateId: string): Event[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockEvent(aggregateId, `Event${index + 1}`, index)
  );
};

describe('InMemoryEventStore', () => {
  let eventStore: ReturnType<typeof createInMemoryEventStore>;

  // Create a new event store before each test
  beforeEach(() => {
    eventStore = createInMemoryEventStore();
  });

  // Test suite for saving events
  describe('saveEvents', () => {
    // Test cases for saving events for a new aggregate
    const storageTestCases = [
      { name: 'single event', eventCount: 1 },
      { name: 'multiple events', eventCount: 3 },
      { name: 'empty events', eventCount: 0 },
    ];

    // Test cases for saving events for a new aggregate
    test.each(storageTestCases)(
      'should save $name for new aggregate',
      async ({ eventCount }) => {
        // Initialize aggregate and events
        const aggregateId = uuidv4();
        const events = createTestEvents(eventCount, aggregateId);

        // Save events
        await eventStore.saveEvents(aggregateId, events, 0);

        // Assert events were saved
        const storedEvents = await eventStore.getEvents(aggregateId);
        expect(storedEvents).toHaveLength(eventCount);
      }
    );

    // Test cases for appending events to an existing aggregate
    const appendTestCases = [
      { initialEvents: 1, newEvents: 1, expectedTotal: 2 },
      { initialEvents: 2, newEvents: 3, expectedTotal: 5 },
      { initialEvents: 0, newEvents: 1, expectedTotal: 1 },
    ];

    // Test cases for appending events to an existing aggregate
    test.each(appendTestCases)(
      'should append $newEvents events to existing aggregate with $initialEvents events',
      async ({ initialEvents, newEvents, expectedTotal }) => {
        // Initialize aggregate and events
        const aggregateId = uuidv4();
        const initialEventList = createTestEvents(initialEvents, aggregateId);
        const newEventList = createTestEvents(newEvents, aggregateId);

        // Save initial events if any
        if (initialEvents > 0) {
          await eventStore.saveEvents(aggregateId, initialEventList, 0);
        }

        // Save events
        await eventStore.saveEvents(aggregateId, newEventList, initialEvents);

        // Assert events were saved
        const allEvents = await eventStore.getEvents(aggregateId);
        expect(allEvents).toHaveLength(expectedTotal);
      }
    );
  });

  // Test suite for retrieving events by aggregate ID
  describe('getEvents', () => {
    const retrievalTestCases = [
      { aggregateId: 'non-existent-id', expectedCount: 0 },
      { aggregateId: '', expectedCount: 0 },
      { aggregateId: 'invalid-uuid', expectedCount: 0 },
    ];

    test.each(retrievalTestCases)(
      'should return empty array for $aggregateId',
      async ({ aggregateId, expectedCount }) => {
        // Get events
        const events = await eventStore.getEvents(aggregateId);

        // Assert events were retrieved
        expect(events).toHaveLength(expectedCount);
      }
    );

    // Test cases for event order
    const orderTestCases = [
      { eventCount: 2, description: 'two events' },
      { eventCount: 5, description: 'multiple events' },
      { eventCount: 1, description: 'single event' },
    ];

    test.each(orderTestCases)(
      'should return events in correct order for $description',
      async ({ eventCount }) => {
        // Initialize aggregate and events
        const aggregateId = uuidv4();
        const events = createTestEvents(eventCount, aggregateId);

        // Save events one by one to ensure proper ordering
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          if (event) {
            await eventStore.saveEvents(aggregateId, [event], i);
          }
        }

        // Get events
        const retrievedEvents = await eventStore.getEvents(aggregateId);

        // Assert events were retrieved
        expect(retrievedEvents).toHaveLength(eventCount);
        retrievedEvents.forEach((event, index) => {
          expect(event.version).toBe(index);
        });
      }
    );
  });

  // Test suite for optimistic concurrency control
  describe('optimisticConcurrencyControl', () => {
    // Test cases for optimistic concurrency control
    const concurrencyTestCases = [
      { expectedVersion: 0, actualVersion: 1, shouldThrow: true },
      { expectedVersion: 1, actualVersion: 1, shouldThrow: false },
      { expectedVersion: 5, actualVersion: 3, shouldThrow: true },
      { expectedVersion: 0, actualVersion: 0, shouldThrow: false },
    ];

    // Test cases for optimistic concurrency control
    test.each(concurrencyTestCases)(
      'should $shouldThrow ? "prevent" : "allow" concurrent modifications when expected version is $expectedVersion and actual is $actualVersion',
      async ({ expectedVersion, actualVersion, shouldThrow }) => {
        // Initialize aggregate and events
        const aggregateId = uuidv4();
        const events = createTestEvents(actualVersion, aggregateId);
        const newEvent = createMockEvent(
          aggregateId,
          'NewEvent',
          actualVersion
        );

        if (actualVersion > 0) {
          await eventStore.saveEvents(aggregateId, events, 0);
        }

        // Assert concurrency control
        if (shouldThrow) {
          await expect(
            eventStore.saveEvents(aggregateId, [newEvent], expectedVersion)
          ).rejects.toThrow(
            `Concurrency conflict. Expected version ${expectedVersion}, but found ${actualVersion}`
          );
        } else {
          await expect(
            eventStore.saveEvents(aggregateId, [newEvent], expectedVersion)
          ).resolves.not.toThrow();
        }
      }
    );
  });

  // Test suite for multiple aggregate isolation
  describe('multipleAggregateIsolation', () => {
    // Test cases for multiple aggregates
    const multiAggregateTestCases = [
      { aggregateCount: 2, eventsPerAggregate: 1 },
      { aggregateCount: 3, eventsPerAggregate: 2 },
      { aggregateCount: 1, eventsPerAggregate: 5 },
    ];

    // Test cases for multiple aggregates
    test.each(multiAggregateTestCases)(
      'should handle $aggregateCount aggregates with $eventsPerAggregate events each independently',
      async ({ aggregateCount, eventsPerAggregate }) => {
        // Initialize aggregate IDs
        const aggregateIds = Array.from({ length: aggregateCount }, () =>
          uuidv4()
        );

        // Save events
        for (let i = 0; i < aggregateCount; i++) {
          const aggregateId = aggregateIds[i];
          if (aggregateId) {
            const events = createTestEvents(eventsPerAggregate, aggregateId);
            await eventStore.saveEvents(aggregateId, events, 0);
          }
        }

        // Assert events were saved
        for (let i = 0; i < aggregateCount; i++) {
          const aggregateId = aggregateIds[i];
          if (aggregateId) {
            const retrievedEvents = await eventStore.getEvents(aggregateId);
            expect(retrievedEvents).toHaveLength(eventsPerAggregate);
            expect(retrievedEvents[0]?.aggregateId).toBe(aggregateId);
          }
        }
      }
    );
  });

  // Test suite for retrieving all events
  describe('getAllEvents', () => {
    // Test case for retrieving all events across aggregates sorted by timestamp
    test('should retrieve all events across aggregates sorted by timestamp', async () => {
      // Initialize aggregate IDs
      const aggregateIds = [uuidv4(), uuidv4(), uuidv4()];

      // Create events with slight time differences to ensure proper ordering
      for (let i = 0; i < aggregateIds.length; i++) {
        const aggregateId = aggregateIds[i];
        if (aggregateId) {
          const event = createMockEvent(aggregateId, `Event${i + 1}`, 0);
          await eventStore.saveEvents(aggregateId, [event], 0);

          // Small delay to ensure different timestamps
          if (i < aggregateIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      }

      // Get all events
      const retrievedEvents = await eventStore.getAllEvents();

      // Assert events were retrieved
      expect(retrievedEvents).toHaveLength(aggregateIds.length);

      // Events should be sorted by timestamp
      for (let i = 0; i < retrievedEvents.length - 1; i++) {
        const currentEvent = retrievedEvents[i];
        const nextEvent = retrievedEvents[i + 1];
        if (currentEvent && nextEvent) {
          expect(currentEvent.timestamp.getTime()).toBeLessThanOrEqual(
            nextEvent.timestamp.getTime()
          );
        }
      }
    });
  });

  // Test suite for edge cases and error handling
  describe('edgeCases', () => {
    // Test cases for empty event arrays and single empty event
    const edgeCaseTestCases = [
      { name: 'empty event arrays', events: [] },
      {
        name: 'single empty event',
        events: [createMockEvent(uuidv4(), 'EmptyEvent', 0)],
      },
    ];

    // Test cases for empty event arrays and single empty event
    test.each(edgeCaseTestCases)('should handle $name', async ({ events }) => {
      // Initialize aggregate ID
      const aggregateId = uuidv4();

      // Assert events were saved
      await expect(
        eventStore.saveEvents(aggregateId, events, 0)
      ).resolves.not.toThrow();

      const retrievedEvents = await eventStore.getEvents(aggregateId);
      expect(retrievedEvents).toHaveLength(events.length);
    });

    // Test case for retrieving all events when no events exist globally
    test('should return empty array when no events exist globally', async () => {
      // Get all events
      const allEvents = await eventStore.getAllEvents();

      // Assert no events were retrieved
      expect(allEvents).toEqual([]);
    });
  });
});
