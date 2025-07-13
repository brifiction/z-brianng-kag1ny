import { startOfSecond } from 'date-fns';
import type { EventStore, CommandResponse } from '@/shared/types';
import {
  createAccount,
  createEmptyAccountState,
  loadFromHistory,
  withdrawMoney,
} from '@/domain/Account/Account';
import type {
  CreateAccountCommand,
  WithdrawMoneyCommand,
} from '@/domain/Account/types';

/* Response factory functions */
const createSuccessResponse = <TResult>(
  result: TResult,
  commandId: string
): CommandResponse<TResult> => ({
  success: true,
  result,
  commandId,
  timestamp: startOfSecond(new Date()),
});

const createErrorResponse = (
  error: string,
  commandId: string
): CommandResponse<never> => ({
  success: false,
  error,
  commandId,
  timestamp: startOfSecond(new Date()),
});

/* Account command handler - Create account command */
export namespace CreateAccount {
  export interface Response {
    readonly accountId: string;
    readonly initialBalance: number;
    readonly version: number;
  }

  export const handle = async (
    command: CreateAccountCommand,
    eventStore: EventStore
  ): Promise<CommandResponse<Response>> => {
    try {
      // Check if account already exists
      const existingEvents = await eventStore.getEvents(
        command.commandData.accountId
      );

      if (existingEvents.length > 0) {
        return createErrorResponse(
          `Account ${command.commandData.accountId} already exists`,
          command.commandId
        );
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

      // Return success response
      return createSuccessResponse(
        {
          accountId: command.commandData.accountId,
          initialBalance: command.commandData.initialBalance,
          version: 1,
        },
        command.commandId
      );
    } catch (error) {
      return createErrorResponse(
        `Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        command.commandId
      );
    }
  };
}

/* Account command handler - Withdraw money command */
export namespace WithdrawMoney {
  export interface Response {
    readonly accountId: string;
    readonly amount: number;
    readonly newBalance: number;
    readonly version: number;
  }

  export const handle = async (
    command: WithdrawMoneyCommand,
    eventStore: EventStore
  ): Promise<CommandResponse<Response>> => {
    try {
      // Load account from event history
      const events = await eventStore.getEvents(command.commandData.accountId);

      if (events.length === 0) {
        return createErrorResponse(
          `Account ${command.commandData.accountId} not found`,
          command.commandId
        );
      }

      // Reconstruct account state
      const initialState = createEmptyAccountState(
        command.commandData.accountId
      );
      const currentState = loadFromHistory(initialState, events);

      // Execute business logic
      const newState = withdrawMoney(currentState, command.commandData.amount);

      // Save new events if any were generated
      if (newState.uncommittedEvents.length > 0) {
        await eventStore.saveEvents(
          command.commandData.accountId,
          newState.uncommittedEvents,
          events.length
        );
      }

      // Return success response
      return createSuccessResponse(
        {
          accountId: command.commandData.accountId,
          amount: command.commandData.amount,
          newBalance: newState.balance,
          version: events.length + newState.uncommittedEvents.length,
        },
        command.commandId
      );
    } catch (error) {
      return createErrorResponse(
        `Failed to withdraw money: ${error instanceof Error ? error.message : 'Unknown error'}`,
        command.commandId
      );
    }
  };
}

export const handleCreateAccountCommand = CreateAccount.handle;
export const handleWithdrawMoneyCommand = WithdrawMoney.handle;
