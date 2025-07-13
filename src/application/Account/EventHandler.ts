import type { EventStore } from '@/shared/types';
import {
  AccountCreatedEventSchema,
  type AccountCreatedEvent,
} from '@/shared/schemas/event';

export interface EventHandlerService {
  handleAccountCreatedEvent(event: AccountCreatedEvent): Promise<void>;
}

export const createEventHandlerService = (
  eventStore: EventStore
): EventHandlerService => {
  const handleAccountCreatedEvent = async (
    event: AccountCreatedEvent
  ): Promise<void> => {
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
  };

  return {
    handleAccountCreatedEvent,
  };
};
