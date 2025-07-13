/* CQRS and Event-sourcing types */

// Base command interface with payload data
export interface BaseCommand {
  readonly commandId: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
}

// Base event interface with payload data
export interface BaseEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly version: number;
}

// Defined command type with payload data
export type Command<TData = Record<string, unknown>> = BaseCommand & {
  readonly commandType: string;
  readonly commandData: TData;
};

// Defined event type with payload data
export type Event<TData = Record<string, unknown>> = BaseEvent & {
  readonly eventType: string;
  readonly eventData: TData;
};

/* Response models */
export interface CommandResponse<TResult = unknown> {
  readonly success: boolean;
  readonly result?: TResult;
  readonly error?: string;
  readonly commandId: string;
  readonly timestamp: Date;
}

export interface QueryResponse<TResult = unknown> {
  readonly success: boolean;
  readonly result?: TResult;
  readonly error?: string;
  readonly queryId: string;
  readonly timestamp: Date;
}

/* Event store operations */
export interface EventReader {
  getEvents(aggregateId: string): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
}

export interface EventWriter {
  saveEvents(
    aggregateId: string,
    events: Event[],
    expectedVersion: number
  ): Promise<void>;
}

/* Complete event store combining read/write operations */
export interface EventStore extends EventReader, EventWriter {}

/* Application layer handlers */
export interface CommandHandler<TCommand extends Command, TResult = unknown> {
  handle(command: TCommand): Promise<CommandResponse<TResult>>;
}

/* Event handler */
export interface EventHandler<TEvent extends Event> {
  handle(event: TEvent): Promise<void>;
}

/* Query abstraction for read operations */
export interface Query<TResult = unknown> {
  execute(): Promise<QueryResponse<TResult>>;
}

/* Domain aggregate contract */
export interface AggregateRoot {
  readonly id: string;
  readonly version: number;
  getUncommittedEvents(): Event[];
  loadFromHistory(events: Event[]): void;
  markEventsAsCommitted(): void;
}
