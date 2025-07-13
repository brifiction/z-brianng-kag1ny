/* CQRS and Event-sourcing types */

export interface Command {
  readonly commandId: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
}

export interface Event {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly eventData: unknown;
  readonly timestamp: Date;
  readonly version: number;
}

export interface EventStore {
  saveEvents(
    aggregateId: string,
    events: Event[],
    expectedVersion: number
  ): Promise<void>;
  getEvents(aggregateId: string): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
}

export interface CommandHandler<T extends Command> {
  handle(command: T): Promise<void>;
}

export interface EventHandler<T extends Event> {
  handle(event: T): Promise<void>;
}

export interface Query<TResult> {
  execute(): Promise<TResult>;
}

export interface AggregateRoot {
  readonly id: string;
  readonly version: number;
  getUncommittedEvents(): Event[];
  loadFromHistory(events: Event[]): void;
  markEventsAsCommitted(): void;
}
