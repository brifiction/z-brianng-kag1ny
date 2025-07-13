import type { Command, Event } from '@/shared/types';

// Command data interfaces
export interface CreateAccountCommandData {
  readonly accountId: string;
  readonly initialBalance: number;
}

export interface WithdrawMoneyCommandData {
  readonly accountId: string;
  readonly amount: number;
}

// Command types using the new shared structure
export type CreateAccountCommand = Command<CreateAccountCommandData>;
export type WithdrawMoneyCommand = Command<WithdrawMoneyCommandData>;

// Account state interface
export interface AccountState {
  readonly id: string;
  readonly balance: number;
  readonly version: number;
  readonly uncommittedEvents: Event[];
}
