import { v4 as uuidv4 } from 'uuid';
import { startOfSecond } from 'date-fns';
import type { EventStore, QueryResponse } from '@/shared/types';
import {
  createEmptyAccountState,
  loadFromHistory,
} from '@/domain/Account/Account';
import {
  GetAccountBalanceQuerySchema,
  GetAccountBalanceResponseSchema,
  GetAllAccountsResponseSchema,
  type GetAccountBalanceQuery,
  type GetAccountBalanceResponse,
  type GetAllAccountsQuery,
  type GetAllAccountsResponse,
} from '@/shared/schemas/query';

// Response factory functions (co-located with handlers)
const createSuccessQueryResponse = <TResult>(
  result: TResult,
  queryId?: string
): QueryResponse<TResult> => ({
  success: true,
  result,
  queryId: queryId || uuidv4(),
  timestamp: startOfSecond(new Date()),
});

const createErrorQueryResponse = (
  error: string,
  queryId?: string
): QueryResponse<never> => ({
  success: false,
  error,
  queryId: queryId || uuidv4(),
  timestamp: startOfSecond(new Date()),
});

// Query models using Zod schemas
export namespace GetAccountBalance {
  export type Query = GetAccountBalanceQuery;
  export type Response = GetAccountBalanceResponse;

  export const handle = async (
    query: Query,
    eventStore: EventStore
  ): Promise<QueryResponse<Response>> => {
    try {
      // Validate query input
      const validatedQuery = GetAccountBalanceQuerySchema.parse(query);

      // Load account from event history
      const events = await eventStore.getEvents(validatedQuery.accountId);

      if (events.length === 0) {
        return createErrorQueryResponse(
          `Account ${validatedQuery.accountId} not found`
        );
      }

      // Reconstruct account state
      const initialState = createEmptyAccountState(validatedQuery.accountId);
      const currentState = loadFromHistory(initialState, events);

      // Create response and validate it
      const response: Response = {
        accountId: validatedQuery.accountId,
        balance: currentState.balance,
        version: events.length,
        lastUpdated:
          events[events.length - 1]?.timestamp || startOfSecond(new Date()),
      };

      // Validate response
      GetAccountBalanceResponseSchema.parse(response);

      // Return success response
      return createSuccessQueryResponse(response);
    } catch (error) {
      return createErrorQueryResponse(
        `Failed to get account balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };
}

export namespace GetAllAccounts {
  export type Query = GetAllAccountsQuery;
  export type Response = GetAllAccountsResponse;

  export const handle = async (
    query: Query,
    eventStore: EventStore
  ): Promise<QueryResponse<Response>> => {
    try {
      // Get all events
      const allEvents = await eventStore.getAllEvents();

      // Group events by aggregate ID
      const eventsByAggregate = new Map<string, typeof allEvents>();
      for (const event of allEvents) {
        const existing = eventsByAggregate.get(event.aggregateId) || [];
        existing.push(event);
        eventsByAggregate.set(event.aggregateId, existing);
      }

      // Reconstruct account states
      const accounts: Response['accounts'] = [];
      for (const [aggregateId, events] of eventsByAggregate) {
        const initialState = createEmptyAccountState(aggregateId);
        const currentState = loadFromHistory(initialState, events);

        accounts.push({
          accountId: aggregateId,
          balance: currentState.balance,
          version: events.length,
        });
      }

      // Create response and validate it
      const response: Response = {
        accounts,
        totalCount: accounts.length,
      };

      // Validate response
      GetAllAccountsResponseSchema.parse(response);

      // Return success response
      return createSuccessQueryResponse(response);
    } catch (error) {
      return createErrorQueryResponse(
        `Failed to get all accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };
}
