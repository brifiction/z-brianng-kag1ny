# CQRS + Event Sourcing Challenge: Withdraw from Account

A comprehensive demonstration of CQRS + Event Sourcing + DDD (and simple event-driven) design patterns implemented in Node + TypeScript. This project showcases a simplified banking system for account management with money withdrawal capabilities.

## Architecture Overview

This project demonstrates how to build a scalable, auditable, and maintainable system using modern architectural patterns:

1. **CQRS** - Separates read and write operations for optimal performance
2. **DDD** - Implements pure domain logic with clear business boundaries
3. **Event Sourcing** - Captures all state changes as immutable events
4. **Event-Driven Architecture** - Components communicate through events

## Getting started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/brifiction/inl-bng-voquUiQb5XA.git
cd z-brianng-KaG1nY

# Install dependencies
npm install

# Linting
npm run lint

# (optional) Fix linting issues
npm run lint:fix
```

### Running the Demo

```bash
# Run all tests
npm run test

# (optional) Run all tests with coverage
npm run test:coverage

# (optional) Fix linting issues
npm run lint:fix
```

## Project Structure

```
src/
├── domain/                               # Domain layer (DDD)
│   └── Account/
│       ├── Account.ts                    # Domain functions
│       ├── Commands.ts                   # Command definitions
│       ├── Events.ts                     # Event definitions
│       └── types.ts                      # Domain types
├── application/                          # Application services (CQRS)
│   └── Account/
│       └── CommandHandler.ts             # Account command handler
├── infrastructure/                       # Infrastructure layer
│   ├── InMemoryEventStore.ts             # Event store implementation
│   └── services/
│       └── EventStoreService.ts          # Event handling service
├── queries/                              # Queries (CQRS)
│   └── AccountBalanceQuery.ts            # Query handlers
├── shared/                               # Shared types and schemas
│   ├── schemas/
│   │   ├── command.ts                    # Command validation schemas
│   │   ├── event.ts                      # Event validation schemas
│   │   └── query.ts                      # Query validation schemas
│   └── types.ts                          # Interfaces & types (Typescript)
└── __tests__/
    ├── domain/*                          # Domain logic tests
    ├── application/*                     # Application layer tests
    ├── infrastructure/*                  # Infrastructure tests
    └── queries/*                         # Query layer tests
```

## Key Features Demonstrated

### 1. Account Management

- Create accounts with initial balance
- Withdraw money with business rule validation
- Handle insufficient funds scenarios

### 2. Event Sourcing

- All state changes captured as immutable events
- Complete audit trail of account operations
- State reconstruction from event history

### 3. CQRS Pattern

- **Command Side**: Handle write operations (create account, withdraw money)
- **Query Side**: Handle read operations (get balance, list accounts)
- Optimized for different use cases

### 4. Domain-Driven Design

- Pure business logic in domain layer
- Clear aggregate boundaries
- Ubiquitous language throughout codebase

### 5. Comprehensive Testing

- 93%+ code coverage
- Educational test comments explaining business logic
- Multi-layered testing strategy

## Running the Demo Scenarios

### Scenario 1: Create and Query Account

```typescript
// This is demonstrated in the tests
import { handleCreateAccountCommand } from './src/application/Account/CommandHandler';
import { GetAccountBalance } from './src/queries/AccountBalanceQuery';

// Create account
const createResult = await handleCreateAccountCommand(
  {
    commandId: 'cmd-1',
    commandData: { accountId: 'account-1', initialBalance: 1000 },
  },
  eventStore
);

// Query balance
const balanceResult = await GetAccountBalance.handle(
  {
    accountId: 'account-1',
  },
  eventStore
);

console.log('Account created:', createResult.result);
console.log('Current balance:', balanceResult.result.balance);
```

### Scenario 2: Withdraw Money with Concurrency

```typescript
// This demonstrates optimistic concurrency control
const withdraw1 = handleWithdrawMoneyCommand(
  {
    commandId: 'cmd-2',
    commandData: { accountId: 'account-1', amount: 200 },
  },
  eventStore
);

const withdraw2 = handleWithdrawMoneyCommand(
  {
    commandId: 'cmd-3',
    commandData: { accountId: 'account-1', amount: 300 },
  },
  eventStore
);

// One will succeed, one will fail with concurrency conflict
const results = await Promise.allSettled([withdraw1, withdraw2]);
```

### Scenario 3: Insufficient Funds Handling

```typescript
// This demonstrates business rule validation
const result = await handleWithdrawMoneyCommand(
  {
    commandId: 'cmd-4',
    commandData: { accountId: 'account-1', amount: 2000 }, // More than balance
  },
  eventStore
);

// Result will be error with insufficient funds message
console.log('Withdrawal result:', result.error);
```

## Test Coverage and Quality

```bash
# Run tests with coverage report
npm run test:coverage
```

## Understanding the design patterns

### Event Sourcing

```typescript
// Traditional approach
account.balance -= amount;
database.save(account);

// Event Sourcing approach
const event = withdrawMoney(accountState, amount);
await eventStore.saveEvents(accountId, [event]);
const currentState = loadFromHistory(await eventStore.getEvents(accountId));
```

### State Reconstruction

```typescript
// Rebuild state from events
function loadFromHistory(events: Event[]): AccountState {
  return events.reduce(applyEvent, initialState);
}

// Apply each event sequentially
const applyEvent = (state: AccountState, event: Event): AccountState => {
  switch (event.eventType) {
    case 'AccountCreated':
      return { ...state, balance: event.initialBalance };
    case 'MoneyWithdrawn':
      return { ...state, balance: state.balance - event.amount };
  }
};
```

### CQRS Separation

```typescript
// Command Side (Write)
await handleWithdrawMoneyCommand(command, eventStore);

// Query Side (Read)
const balance = await GetAccountBalance.handle(query, eventStore);
```

## Educational Resources

### Documentation Files

1. CQRS pattern - https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
2. CQRS pattern in C# & Clean Architecture - https://www.codeproject.com/Articles/5377617/CQRS-Pattern-in-Csharp-and-Clean-Architecture-A-Si
3. Event Sourcing pattern - https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing

## Development Workflow

### Example 1: Adding New Features

1. **Define Domain Commands** in `src/domain/Account/commands.ts`
2. **Implement Domain Logic** in `src/domain/Account/Account.ts`
3. **Add Event Definitions** in `src/domain/Account/events.ts`
4. **Create Command Handler** in `src/application/Account/CommandHandler.ts`
5. **Write Tests** in `src/__tests__/domain/` and `src/__tests__/application/`

### Testing Strategy

```bash
# Run specific test files
npm test -- Account.Domain.test.ts
npm test -- Account.CommandHandler.test.ts
npm test -- AccountBalance.Query.test.ts

# Run tests in watch mode
npm run test:watch
```

## Demo Scenarios

### Scenario A: Basic Account Operations

1. Create account with $1000
2. Query balance (should show $1000)
3. Withdraw $300
4. Query balance (should show $700)

### Scenario B: Business Rule Validation

1. Create account with $500
2. Try to withdraw $1000
3. Should get "Insufficient funds" error
4. Verify balance remains $500

### Scenario C: Concurrency Handling

1. Create account with $1000
2. Submit two concurrent withdrawals of $600 each
3. One should succeed, one should fail with concurrency conflict
4. Verify final balance is $400

### Scenario D: Audit Trail

1. Perform multiple operations on an account
2. Show complete event history
3. Demonstrate state reconstruction from events
4. Show temporal queries (state at any point in time)

### Scenario E: Edge Cases and Validation

1. Create account with $1000
2. Try to withdraw negative amount (-$100)
3. Should get validation error
4. Try to withdraw zero amount ($0)
5. Should get validation error
6. Verify balance remains $1000
