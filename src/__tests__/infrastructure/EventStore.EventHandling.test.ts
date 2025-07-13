/**
 * Event Store Event Handling Test Suite
 *
 * This test suite covers the event handling, validation, and processing logic.
 * It verifies event validation, error handling, and service delegation.
 *
 * For event storage and retrieval mechanics, see EventStore.persistence.test.ts.
 */
import { v4 as uuidv4 } from 'uuid';
import { startOfSecond } from 'date-fns';
import type { EventStore } from '@/shared/types';
import { createInMemoryEventStore } from '@/infrastructure/InMemoryEventStore';
import {
  AccountCreated,
  MoneyWithdrawn,
  InsufficientFunds,
  createEventHandlerService,
} from '@/infrastructure/services/EventStoreService';
import type {
  AccountCreatedEvent,
  MoneyWithdrawnEvent,
  InsufficientFundsEvent,
} from '@/shared/schemas/event';

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;

beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('EventStoreService', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    eventStore = createInMemoryEventStore();
  });

  describe('AccountCreated Event Handler', () => {
    const createValidAccountCreatedEvent = (): AccountCreatedEvent => ({
      eventId: uuidv4(),
      aggregateId: 'account-123',
      eventType: 'AccountCreated',
      eventData: {
        accountId: 'account-123',
        initialBalance: 1000,
      },
      timestamp: startOfSecond(new Date()),
      version: 1,
    });

    it('should successfully process valid AccountCreated event', async () => {
      /*
       * This test verifies that a valid AccountCreated event is correctly validated,
       * persisted to the event store, and returns a success response. This is essential
       * for ensuring that the event sourcing flow works for new account creation.
       */
      const event = createValidAccountCreatedEvent();
      const result = await AccountCreated.handle(event, eventStore);

      // The handler should return a success response with the correct eventId and timestamp.
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();

      // The event should be persisted in the event store for future state reconstruction.
      const savedEvents = await eventStore.getEvents(event.aggregateId);
      expect(savedEvents).toHaveLength(1);
      expect(savedEvents[0]).toEqual(event);
    });

    it('should handle invalid AccountCreated event data', async () => {
      /*
       * This test ensures that invalid event data (e.g., empty accountId, negative balance)
       * is caught by validation, and the handler returns a failure response with an error message.
       * This protects the system from corrupt or incomplete events.
       */
      const invalidEvent = {
        ...createValidAccountCreatedEvent(),
        eventData: {
          accountId: '', // Invalid: empty string
          initialBalance: -100, // Invalid: negative balance
        },
      };
      const result = await AccountCreated.handle(
        invalidEvent as AccountCreatedEvent,
        eventStore
      );

      // The handler should return a failure response with a validation error message.
      expect(result.success).toBe(false);
      expect(result.eventId).toBe(invalidEvent.eventId);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toContain('Failed to process Account Created Event');
    });

    it('should handle event store errors gracefully', async () => {
      /*
       * This test simulates a failure in the event store (e.g., database connection error)
       * and verifies that the handler returns a failure response with the error message.
       * This ensures robust error handling and clear feedback for infrastructure issues.
       */
      const event = createValidAccountCreatedEvent();
      const mockEventStore: EventStore = {
        saveEvents: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
        getEvents: jest.fn().mockResolvedValue([]),
        getAllEvents: jest.fn().mockResolvedValue([]),
      };
      const result = await AccountCreated.handle(event, mockEventStore);

      // The handler should return a failure response with the infrastructure error message.
      expect(result.success).toBe(false);
      expect(result.eventId).toBe(event.eventId);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('MoneyWithdrawn Event Handler', () => {
    const createValidMoneyWithdrawnEvent = (): MoneyWithdrawnEvent => ({
      eventId: uuidv4(),
      aggregateId: 'account-123',
      eventType: 'MoneyWithdrawn',
      eventData: {
        accountId: 'account-123',
        amount: 100,
        newBalance: 900,
      },
      timestamp: startOfSecond(new Date()),
      version: 2,
    });

    it('should successfully process valid MoneyWithdrawn event', async () => {
      /*
       * This test verifies that a valid MoneyWithdrawn event is correctly validated,
       * persisted to the event store, and returns a success response. This ensures
       * that successful withdrawal operations are properly recorded in the event stream.
       */
      const event = createValidMoneyWithdrawnEvent();
      const result = await MoneyWithdrawn.handle(event, eventStore);

      // The handler should return a success response with the correct eventId and timestamp.
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();

      // The event should be persisted in the event store for audit trail and state reconstruction.
      const savedEvents = await eventStore.getEvents(event.aggregateId);
      expect(savedEvents).toHaveLength(1);
      expect(savedEvents[0]).toEqual(event);
    });

    it('should handle invalid MoneyWithdrawn event data', async () => {
      /*
       * This test ensures that invalid withdrawal data (e.g., empty accountId, zero amount,
       * negative balance) is caught by validation, and the handler returns a failure response.
       * This prevents corrupt withdrawal events from being persisted.
       */
      const invalidEvent = {
        ...createValidMoneyWithdrawnEvent(),
        eventData: {
          accountId: '', // Invalid: empty string
          amount: 0, // Invalid: zero amount
          newBalance: -50, // Invalid: negative balance
        },
      };
      const result = await MoneyWithdrawn.handle(
        invalidEvent as MoneyWithdrawnEvent,
        eventStore
      );

      // The handler should return a failure response with a validation error message.
      expect(result.success).toBe(false);
      expect(result.eventId).toBe(invalidEvent.eventId);
      expect(result.error).toContain('Failed to process Money Withdrawn Event');
    });

    it('should handle event store errors gracefully', async () => {
      /*
       * This test simulates a failure in the event store during withdrawal event persistence
       * and verifies that the handler returns a failure response with the error message.
       * This ensures robust error handling for withdrawal operations.
       */
      const event = createValidMoneyWithdrawnEvent();
      const mockEventStore: EventStore = {
        saveEvents: jest.fn().mockRejectedValue(new Error('Storage error')),
        getEvents: jest.fn().mockResolvedValue([]),
        getAllEvents: jest.fn().mockResolvedValue([]),
      };
      const result = await MoneyWithdrawn.handle(event, mockEventStore);

      // The handler should return a failure response with the infrastructure error message.
      expect(result.success).toBe(false);
      expect(result.eventId).toBe(event.eventId);
      expect(result.error).toContain('Storage error');
    });
  });

  describe('InsufficientFunds Event Handler', () => {
    const createValidInsufficientFundsEvent = (): InsufficientFundsEvent => ({
      eventId: uuidv4(),
      aggregateId: 'account-123',
      eventType: 'InsufficientFunds',
      eventData: {
        accountId: 'account-123',
        requestedAmount: 1500,
        currentBalance: 1000,
      },
      timestamp: startOfSecond(new Date()),
      version: 2,
    });

    it('should successfully process valid InsufficientFunds event', async () => {
      /*
       * This test verifies that a valid InsufficientFunds event is correctly validated,
       * persisted to the event store, and returns a success response. This ensures
       * that failed withdrawal attempts are properly recorded for audit purposes.
       */
      const event = createValidInsufficientFundsEvent();
      const result = await InsufficientFunds.handle(event, eventStore);

      // The handler should return a success response with the correct eventId and timestamp.
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();

      // The event should be persisted in the event store for audit trail and compliance.
      const savedEvents = await eventStore.getEvents(event.aggregateId);
      expect(savedEvents).toHaveLength(1);
      expect(savedEvents[0]).toEqual(event);
    });

    it('should handle invalid InsufficientFunds event data', async () => {
      /*
       * This test ensures that invalid insufficient funds data (e.g., empty accountId,
       * zero requested amount, negative balance) is caught by validation, and the
       * handler returns a failure response. This prevents corrupt audit events.
       */
      const invalidEvent = {
        ...createValidInsufficientFundsEvent(),
        eventData: {
          accountId: '', // Invalid: empty string
          requestedAmount: 0, // Invalid: zero amount
          currentBalance: -100, // Invalid: negative balance
        },
      };
      const result = await InsufficientFunds.handle(
        invalidEvent as InsufficientFundsEvent,
        eventStore
      );

      // The handler should return a failure response with a validation error message.
      expect(result.success).toBe(false);
      expect(result.eventId).toBe(invalidEvent.eventId);
      expect(result.error).toContain(
        'Failed to process Insufficient Funds Event'
      );
    });

    it('should handle event store errors gracefully', async () => {
      /*
       * This test simulates a failure in the event store during insufficient funds
       * event persistence and verifies that the handler returns a failure response
       * with the error message. This ensures robust error handling for audit events.
       */
      const event = createValidInsufficientFundsEvent();
      const mockEventStore: EventStore = {
        saveEvents: jest.fn().mockRejectedValue(new Error('Network error')),
        getEvents: jest.fn().mockResolvedValue([]),
        getAllEvents: jest.fn().mockResolvedValue([]),
      };
      const result = await InsufficientFunds.handle(event, mockEventStore);

      // The handler should return a failure response with the infrastructure error message.
      expect(result.success).toBe(false);
      expect(result.eventId).toBe(event.eventId);
      expect(result.error).toContain('Network error');
    });
  });

  describe('EventHandlerService Factory', () => {
    it('should create event handler service with all methods', () => {
      /*
       * This test verifies that the factory function creates a service object with
       * all required event handling methods. This ensures the service interface
       * is complete and can handle all event types in the system.
       */
      const service = createEventHandlerService(eventStore);

      // The service should expose methods for handling all supported event types.
      expect(service).toHaveProperty('handleAccountCreatedEvent');
      expect(service).toHaveProperty('handleMoneyWithdrawnEvent');
      expect(service).toHaveProperty('handleInsufficientFundsEvent');
      expect(typeof service.handleAccountCreatedEvent).toBe('function');
      expect(typeof service.handleMoneyWithdrawnEvent).toBe('function');
      expect(typeof service.handleInsufficientFundsEvent).toBe('function');
    });

    it('should delegate AccountCreated events correctly', async () => {
      /*
       * This test verifies that the service factory correctly delegates AccountCreated
       * events to the appropriate handler. This ensures the service layer properly
       * routes events to their specific handlers.
       */
      const event = {
        eventId: uuidv4(),
        aggregateId: 'account-123',
        eventType: 'AccountCreated' as const,
        eventData: {
          accountId: 'account-123',
          initialBalance: 1000,
        },
        timestamp: startOfSecond(new Date()),
        version: 1,
      };
      const service = createEventHandlerService(eventStore);
      const result = await service.handleAccountCreatedEvent(event);

      // The service should successfully delegate to the AccountCreated handler.
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId);
    });

    it('should delegate MoneyWithdrawn events correctly', async () => {
      /*
       * This test verifies that the service factory correctly delegates MoneyWithdrawn
       * events to the appropriate handler. This ensures withdrawal events are
       * processed by the correct handler logic.
       */
      const event = {
        eventId: uuidv4(),
        aggregateId: 'account-123',
        eventType: 'MoneyWithdrawn' as const,
        eventData: {
          accountId: 'account-123',
          amount: 100,
          newBalance: 900,
        },
        timestamp: startOfSecond(new Date()),
        version: 2,
      };
      const service = createEventHandlerService(eventStore);
      const result = await service.handleMoneyWithdrawnEvent(event);

      // The service should successfully delegate to the MoneyWithdrawn handler.
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId);
    });

    it('should delegate InsufficientFunds events correctly', async () => {
      /*
       * This test verifies that the service factory correctly delegates InsufficientFunds
       * events to the appropriate handler. This ensures audit events for failed
       * withdrawals are processed by the correct handler logic.
       */
      const event = {
        eventId: uuidv4(),
        aggregateId: 'account-123',
        eventType: 'InsufficientFunds' as const,
        eventData: {
          accountId: 'account-123',
          requestedAmount: 1500,
          currentBalance: 1000,
        },
        timestamp: startOfSecond(new Date()),
        version: 2,
      };
      const service = createEventHandlerService(eventStore);
      const result = await service.handleInsufficientFundsEvent(event);

      // The service should successfully delegate to the InsufficientFunds handler.
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle non-Error exceptions', async () => {
      /*
       * This test verifies that the event handler can handle exceptions that are not
       * Error objects (e.g., strings, numbers, null). This ensures robust error
       * handling regardless of the type of exception thrown by the event store.
       */
      const event = {
        eventId: uuidv4(),
        aggregateId: 'account-123',
        eventType: 'AccountCreated' as const,
        eventData: {
          accountId: 'account-123',
          initialBalance: 1000,
        },
        timestamp: startOfSecond(new Date()),
        version: 1,
      };
      const mockEventStore: EventStore = {
        saveEvents: jest.fn().mockRejectedValue('String error'),
        getEvents: jest.fn().mockResolvedValue([]),
        getAllEvents: jest.fn().mockResolvedValue([]),
      };
      const result = await AccountCreated.handle(event, mockEventStore);

      // The handler should return a failure response with a generic error message.
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    it('should handle null/undefined exceptions', async () => {
      /*
       * This test verifies that the event handler can handle null or undefined
       * exceptions gracefully. This ensures the system doesn't crash when the
       * event store throws unexpected null/undefined values.
       */
      const event = {
        eventId: uuidv4(),
        aggregateId: 'account-123',
        eventType: 'AccountCreated' as const,
        eventData: {
          accountId: 'account-123',
          initialBalance: 1000,
        },
        timestamp: startOfSecond(new Date()),
        version: 1,
      };
      const mockEventStore: EventStore = {
        saveEvents: jest.fn().mockRejectedValue(null),
        getEvents: jest.fn().mockResolvedValue([]),
        getAllEvents: jest.fn().mockResolvedValue([]),
      };
      const result = await AccountCreated.handle(event, mockEventStore);

      // The handler should return a failure response with a generic error message.
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });
  });
});
