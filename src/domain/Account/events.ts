import { v4 as uuidv4 } from 'uuid';
import { startOfSecond } from 'date-fns';
import type {
  AccountCreatedEvent,
  AccountCreatedEventData,
  MoneyWithdrawnEvent,
  MoneyWithdrawnEventData,
  InsufficientFundsEvent,
  InsufficientFundsEventData,
} from '@/shared/schemas/event';

export const createAccountCreatedEvent = (
  aggregateId: string,
  eventData: AccountCreatedEventData,
  version: number
): AccountCreatedEvent => ({
  eventId: uuidv4(),
  aggregateId,
  eventType: 'AccountCreated',
  eventData,
  timestamp: startOfSecond(new Date()),
  version,
});

// Factory function for creating MoneyWithdrawnEvent
export const createMoneyWithdrawnEvent = (
  aggregateId: string,
  eventData: MoneyWithdrawnEventData,
  version: number
): MoneyWithdrawnEvent => ({
  eventId: uuidv4(),
  aggregateId,
  eventType: 'MoneyWithdrawn',
  eventData,
  timestamp: startOfSecond(new Date()),
  version,
});

// Factory function for creating InsufficientFundsEvent
export const createInsufficientFundsEvent = (
  aggregateId: string,
  eventData: InsufficientFundsEventData,
  version: number
): InsufficientFundsEvent => ({
  eventId: uuidv4(),
  aggregateId,
  eventType: 'InsufficientFunds',
  eventData,
  timestamp: startOfSecond(new Date()),
  version,
});
