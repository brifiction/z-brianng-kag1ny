/**
 * Zeller Coding Challenge - Account Management System
 *
 *
 * Run tests to see the patterns in action:
 * - npm test                  # Run all tests
 * - npm run test:watch        # Run tests in watch mode
 * - npm run test:coverage     # Run tests with coverage report
 *
 * Key Components:
 * - Domain: Account aggregate with pure business logic
 * - Commands: CreateAccount, WithdrawMoney
 * - Events: AccountCreated, MoneyWithdrawn, InsufficientFunds
 * - Command Handler: Handles commands and updates the account
 * - Event Handler: Handles events and updates the account
 * - InMemoryEventStore: In-memory event persistence
 * - AccountBalanceQuery: Query to get the account balance
 */

export * from './shared/types';
export * from './shared/schemas/event';
export * from './domain/Account/Account';
export * from './domain/Account/Commands';
export * from './domain/Account/Events';
export * from './application/Account/CommandHandler';
export * from './infrastructure/services/EventStoreService';
export * from './infrastructure/InMemoryEventStore';
export * from './queries/AccountBalanceQuery';

console.log(
  'Run "npm test" to see the patterns demonstrated through comprehensive test cases.'
);
