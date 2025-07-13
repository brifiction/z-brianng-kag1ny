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
 * - InMemoryEventStore: In-memory event persistence
 */

export * from './shared/types';
export * from './shared/schemas/event';
export * from './domain/Account/Account';
export * from './domain/Account/Commands';
export * from './domain/Account/Events';
export * from './infrastructure/InMemoryEventStore';

console.log(
  'Run "npm test" to see the patterns demonstrated through comprehensive test cases.'
);
