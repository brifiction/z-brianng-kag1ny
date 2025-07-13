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
import {
  CreateAccountCommandSchema,
  CreateAccountResponseSchema,
  WithdrawMoneyCommandSchema,
  WithdrawMoneyResponseSchema,
  type CreateAccountCommand as CreateAccountCommandData,
  type CreateAccountResponse,
  type WithdrawMoneyCommand as WithdrawMoneyCommandData,
  type WithdrawMoneyResponse,
} from '@/shared/schemas/command';

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
  export type Command = CreateAccountCommandData;
  export type Response = CreateAccountResponse;

  export const handle = async (
    command: CreateAccountCommand,
    eventStore: EventStore
  ): Promise<CommandResponse<Response>> => {
    try {
      // Validate command data
      const validatedCommandData = CreateAccountCommandSchema.parse(
        command.commandData
      );

      // Check if account already exists
      const existingEvents = await eventStore.getEvents(
        validatedCommandData.accountId
      );

      if (existingEvents.length > 0) {
        return createErrorResponse(
          `Account ${validatedCommandData.accountId} already exists`,
          command.commandId
        );
      }

      // Create new account
      const accountState = createAccount(
        validatedCommandData.accountId,
        validatedCommandData.initialBalance
      );

      // Save events to event store
      await eventStore.saveEvents(
        validatedCommandData.accountId,
        accountState.uncommittedEvents,
        0
      );

      // Create response and validate it
      const response: Response = {
        accountId: validatedCommandData.accountId,
        initialBalance: validatedCommandData.initialBalance,
        version: 1,
      };

      // Validate response
      CreateAccountResponseSchema.parse(response);

      // Return success response
      return createSuccessResponse(response, command.commandId);
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
  export type Command = WithdrawMoneyCommandData;
  export type Response = WithdrawMoneyResponse;

  export const handle = async (
    command: WithdrawMoneyCommand,
    eventStore: EventStore
  ): Promise<CommandResponse<Response>> => {
    try {
      // Validate command data
      const validatedCommandData = WithdrawMoneyCommandSchema.parse(
        command.commandData
      );

      // Load account from event history
      const events = await eventStore.getEvents(validatedCommandData.accountId);

      if (events.length === 0) {
        return createErrorResponse(
          `Account ${validatedCommandData.accountId} not found`,
          command.commandId
        );
      }

      // Reconstruct account state
      const initialState = createEmptyAccountState(
        validatedCommandData.accountId
      );
      const currentState = loadFromHistory(initialState, events);

      // Execute business logic
      const newState = withdrawMoney(currentState, validatedCommandData.amount);

      // Check if an insufficient funds event was generated
      const insufficientFundsEvent = newState.uncommittedEvents.find(
        event => event.eventType === 'InsufficientFunds'
      );

      if (insufficientFundsEvent) {
        // Save insufficient funds events before returning error
        await eventStore.saveEvents(
          validatedCommandData.accountId,
          newState.uncommittedEvents,
          events.length
        );

        // Return error response for insufficient funds
        return createErrorResponse(
          `Insufficient funds for account ${validatedCommandData.accountId}. Requested: ${validatedCommandData.amount}, Available: ${currentState.balance}`,
          command.commandId
        );
      }

      // Save new events if any were generated
      if (newState.uncommittedEvents.length > 0) {
        await eventStore.saveEvents(
          validatedCommandData.accountId,
          newState.uncommittedEvents,
          events.length
        );
      }

      // Create response and validate it
      const response: Response = {
        accountId: validatedCommandData.accountId,
        amount: validatedCommandData.amount,
        newBalance: newState.balance,
        version: events.length + newState.uncommittedEvents.length,
      };

      // Validate response
      WithdrawMoneyResponseSchema.parse(response);

      // Return success response
      return createSuccessResponse(response, command.commandId);
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
