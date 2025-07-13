import type { EventStore } from '@/shared/types';
import {
  createAccount,
} from '@/domain/Account/Account';
import type {
  createCreateAccountCommand,
} from '@/domain/Account/Commands';

export const handleCreateAccountCommand = async (
  command: ReturnType<typeof createCreateAccountCommand>,
  eventStore: EventStore
): Promise<void> => {
  // Check if account already exists
  const existingEvents = await eventStore.getEvents(
    command.commandData.accountId
  );

  // If account already exists, throw an error
  if (existingEvents.length > 0) {
    throw new Error(`Account ${command.commandData.accountId} already exists`);
  }

  // Create new account
  const accountState = createAccount(
    command.commandData.accountId,
    command.commandData.initialBalance
  );

  // Save events to event store
  await eventStore.saveEvents(
    command.commandData.accountId,
    accountState.uncommittedEvents,
    0
  );
};
