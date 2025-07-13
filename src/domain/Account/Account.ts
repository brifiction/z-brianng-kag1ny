import type { Event } from '@/shared/types';
import {
  createAccountCreatedEvent,
  createMoneyWithdrawnEvent,
  createInsufficientFundsEvent,
} from './events';
import type {
  AccountCreatedEventData,
  MoneyWithdrawnEventData,
  InsufficientFundsEventData,
  AccountCreatedEvent,
  MoneyWithdrawnEvent,
  InsufficientFundsEvent,
} from '@/shared/schemas/event';
import type { AccountState } from './types';

// Create a new account state
export const createEmptyAccountState = (id: string): AccountState => ({
  id,
  balance: 0,
  version: 0,
  uncommittedEvents: [],
});

// Factory function to create a new account with initial balance
export const createAccount = (
  accountId: string,
  initialBalance: number
): AccountState => {
  const eventData: AccountCreatedEventData = {
    accountId,
    initialBalance,
  };

  const event = createAccountCreatedEvent(accountId, eventData, 0);
  const initialState = createEmptyAccountState(accountId);

  return applyEvent({ ...initialState, uncommittedEvents: [event] }, event);
};

// Business logic: Withdraw money (pure function)
export const withdrawMoney = (
  state: AccountState,
  amount: number
): AccountState => {
  if (amount <= 0) {
    throw new Error('Withdrawal amount must be positive');
  }

  if (state.balance >= amount) {
    // Sufficient funds - create withdrawal event
    const eventData: MoneyWithdrawnEventData = {
      accountId: state.id,
      amount,
      newBalance: state.balance - amount,
    };

    const event = createMoneyWithdrawnEvent(
      state.id,
      eventData,
      state.version + 1
    );
    const newState = applyEvent(state, event);

    return {
      ...newState,
      uncommittedEvents: [...state.uncommittedEvents, event],
    };
  }

  // Insufficient funds - create insufficient funds event
  const eventData: InsufficientFundsEventData = {
    accountId: state.id,
    requestedAmount: amount,
    currentBalance: state.balance,
  };

  const event = createInsufficientFundsEvent(
    state.id,
    eventData,
    state.version + 1
  );
  const newState = applyEvent(state, event);

  return {
    ...newState,
    uncommittedEvents: [...state.uncommittedEvents, event],
  };
};

// Load account state from event history (pure function)
export const loadFromHistory = (
  initialState: AccountState,
  events: Event[]
): AccountState => {
  return events.reduce(applyEvent, initialState);
};

// Mark events as committed (pure function)
export const markEventsAsCommitted = (state: AccountState): AccountState => ({
  ...state,
  uncommittedEvents: [],
});

// Apply a single event to state (pure function)
const applyEvent = (state: AccountState, event: Event): AccountState => {
  const baseState = {
    ...state,
    version: event.version,
  };

  switch (event.eventType) {
    case 'AccountCreated':
      return onAccountCreated(baseState, event as AccountCreatedEvent);
    case 'MoneyWithdrawn':
      return onMoneyWithdrawn(baseState, event as MoneyWithdrawnEvent);
    case 'InsufficientFunds':
      return onInsufficientFunds(baseState, event as InsufficientFundsEvent);
    default:
      throw new Error(`Unknown event type: ${event.eventType}`);
  }
};

// Event application functions (pure functions)
const onAccountCreated = (
  state: AccountState,
  event: AccountCreatedEvent
): AccountState => ({
  ...state,
  balance: event.eventData.initialBalance,
});

const onMoneyWithdrawn = (
  state: AccountState,
  event: MoneyWithdrawnEvent
): AccountState => ({
  ...state,
  balance: event.eventData.newBalance,
});

const onInsufficientFunds = (
  state: AccountState,
  _event: InsufficientFundsEvent
): AccountState => {
  // No state change for insufficient funds - just recorded for audit
  return state;
};
