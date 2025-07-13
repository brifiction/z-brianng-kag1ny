import { startOfSecond } from 'date-fns';
import type { EventStore } from '@/shared/types';
import {
  AccountCreatedEventSchema,
  MoneyWithdrawnEventSchema,
  InsufficientFundsEventSchema,
  type AccountCreatedEvent,
  type MoneyWithdrawnEvent,
  type InsufficientFundsEvent,
} from '@/shared/schemas/event';

/* Response factory functions */
const createSuccessEventResponse = (
  eventId: string
): { success: true; eventId: string; timestamp: Date } => ({
  success: true,
  eventId,
  timestamp: startOfSecond(new Date()),
});

const createErrorEventResponse = (
  error: string,
  eventId: string
): { success: false; error: string; eventId: string; timestamp: Date } => ({
  success: false,
  error,
  eventId,
  timestamp: startOfSecond(new Date()),
});

/* Account event handler - Account Created Event */
export namespace AccountCreated {
  export interface Response {
    readonly success: boolean;
    readonly eventId: string;
    readonly timestamp: Date;
    readonly error?: string;
  }

  export const handle = async (
    event: AccountCreatedEvent,
    eventStore: EventStore
  ): Promise<Response> => {
    try {
      const validatedEvent = AccountCreatedEventSchema.parse(event);

      console.log(
        `[${validatedEvent.timestamp.toISOString()}] Processing Account Created Event: ${
          validatedEvent.eventData.accountId
        } with initial balance: ${validatedEvent.eventData.initialBalance}`
      );

      // Get current events count to determine expected version
      const existingEvents = await eventStore.getEvents(
        validatedEvent.aggregateId
      );

      // Store the validated event
      await eventStore.saveEvents(
        validatedEvent.aggregateId,
        [validatedEvent],
        existingEvents.length
      );

      return createSuccessEventResponse(validatedEvent.eventId);
    } catch (error) {
      return createErrorEventResponse(
        `Failed to process Account Created Event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        event.eventId
      );
    }
  };
}

/* Account event handler - Money Withdrawn Event */
export namespace MoneyWithdrawn {
  export interface Response {
    readonly success: boolean;
    readonly eventId: string;
    readonly timestamp: Date;
    readonly error?: string;
  }

  export const handle = async (
    event: MoneyWithdrawnEvent,
    eventStore: EventStore
  ): Promise<Response> => {
    try {
      const validatedEvent = MoneyWithdrawnEventSchema.parse(event);

      console.log(
        `[${validatedEvent.timestamp.toISOString()}] Processing Money Withdrawn Event: ${
          validatedEvent.eventData.amount
        } from account ${validatedEvent.eventData.accountId}. New balance: ${
          validatedEvent.eventData.newBalance
        }`
      );

      // Get current events count to determine expected version
      const existingEvents = await eventStore.getEvents(
        validatedEvent.aggregateId
      );

      // Store the validated event
      await eventStore.saveEvents(
        validatedEvent.aggregateId,
        [validatedEvent],
        existingEvents.length
      );

      return createSuccessEventResponse(validatedEvent.eventId);
    } catch (error) {
      return createErrorEventResponse(
        `Failed to process Money Withdrawn Event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        event.eventId
      );
    }
  };
}

/* Account event handler - Insufficient Funds Event */
export namespace InsufficientFunds {
  export interface Response {
    readonly success: boolean;
    readonly eventId: string;
    readonly timestamp: Date;
    readonly error?: string;
  }

  export const handle = async (
    event: InsufficientFundsEvent,
    eventStore: EventStore
  ): Promise<Response> => {
    try {
      const validatedEvent = InsufficientFundsEventSchema.parse(event);

      console.log(
        `[${validatedEvent.timestamp.toISOString()}] Processing Insufficient Funds Event: Withdraw attempt with amount ${
          validatedEvent.eventData.requestedAmount
        } from account ${validatedEvent.eventData.accountId} failed. Current balance is ${
          validatedEvent.eventData.currentBalance
        }`
      );

      // Get current events count to determine expected version
      const existingEvents = await eventStore.getEvents(
        validatedEvent.aggregateId
      );

      // Store the validated event
      await eventStore.saveEvents(
        validatedEvent.aggregateId,
        [validatedEvent],
        existingEvents.length
      );

      return createSuccessEventResponse(validatedEvent.eventId);
    } catch (error) {
      return createErrorEventResponse(
        `Failed to process Insufficient Funds Event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        event.eventId
      );
    }
  };
}

/* Event handler service for backward compatibility */
export interface EventHandlerService {
  handleAccountCreatedEvent(
    event: AccountCreatedEvent
  ): Promise<AccountCreated.Response>;
  handleMoneyWithdrawnEvent(
    event: MoneyWithdrawnEvent
  ): Promise<MoneyWithdrawn.Response>;
  handleInsufficientFundsEvent(
    event: InsufficientFundsEvent
  ): Promise<InsufficientFunds.Response>;
}

export const createEventHandlerService = (
  eventStore: EventStore
): EventHandlerService => {
  return {
    handleAccountCreatedEvent: event =>
      AccountCreated.handle(event, eventStore),
    handleMoneyWithdrawnEvent: event =>
      MoneyWithdrawn.handle(event, eventStore),
    handleInsufficientFundsEvent: event =>
      InsufficientFunds.handle(event, eventStore),
  };
};
