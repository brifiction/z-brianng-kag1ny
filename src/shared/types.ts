/* CQRS and Event-sourcing types */

// Base contracts for commands and events
export interface BaseCommand {
  readonly commandId: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
}

export interface BaseEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly version: number;
}

// Concrete command and event types with payload data
export type Command<TData = Record<string, unknown>> = BaseCommand & {
  readonly commandType: string;
  readonly commandData: TData;
};

export type Event<TData = Record<string, unknown>> = BaseEvent & {
  readonly eventType: string;
  readonly eventData: TData;
};

// Event store operations split by responsibility (ISP)
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

// Complete event store combining read/write operations
export interface EventStore extends EventReader, EventWriter {}

// Application layer handlers
export interface CommandHandler<TCommand extends Command> {
  handle(command: TCommand): Promise<void>;
}

export interface EventHandler<TEvent extends Event> {
  handle(event: TEvent): Promise<void>;
}

// Query abstraction for read operations
export interface Query<TResult> {
  execute(): Promise<TResult>;
}

// Domain aggregate contract
export interface AggregateRoot {
  readonly id: string;
  readonly version: number;
  getUncommittedEvents(): Event[];
  loadFromHistory(events: Event[]): void;
  markEventsAsCommitted(): void;
}
