import { v4 as uuidv4 } from 'uuid';
import { startOfSecond } from 'date-fns';
import type { EventStore, QueryResponse } from '@/shared/types';
import {
  createEmptyAccountState,
  loadFromHistory,
} from '@/domain/Account/Account';

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

// Query response models (co-located with handlers)
export namespace GetAccountBalance {
  export interface Request {
    readonly accountId: string;
  }

  export interface Response {
    readonly accountId: string;
    readonly balance: number;
    readonly version: number;
    readonly lastUpdated: Date;
  }

  export const handle = async (
    request: Request,
    eventStore: EventStore
  ): Promise<QueryResponse<Response>> => {
    try {
      // Load account from event history
      const events = await eventStore.getEvents(request.accountId);

      if (events.length === 0) {
        return createErrorQueryResponse(
          `Account ${request.accountId} not found`
        );
      }

      // Reconstruct account state
      const initialState = createEmptyAccountState(request.accountId);
      const currentState = loadFromHistory(initialState, events);

      // Return success response
      return createSuccessQueryResponse({
        accountId: request.accountId,
        balance: currentState.balance,
        version: events.length,
        lastUpdated:
          events[events.length - 1]?.timestamp || startOfSecond(new Date()),
      });
    } catch (error) {
      return createErrorQueryResponse(
        `Failed to get account balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };
}

export namespace GetAllAccounts {
  export interface Response {
    readonly accounts: Array<{
      readonly accountId: string;
      readonly balance: number;
      readonly version: number;
    }>;
    readonly totalCount: number;
  }

  export const handle = async (
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

      // Return success response
      return createSuccessQueryResponse({
        accounts,
        totalCount: accounts.length,
      });
    } catch (error) {
      return createErrorQueryResponse(
        `Failed to get all accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };
}
