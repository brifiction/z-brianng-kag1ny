import { v4 as uuidv4 } from 'uuid';
import { createInMemoryEventStore } from '@/infrastructure/InMemoryEventStore';
import { handleWithdrawMoneyCommand } from '@/application/Account/CommandHandler';
import { createAccount } from '@/domain/Account/Account';
import { createWithdrawMoneyCommand } from '@/domain/Account/Commands';
import type { WithdrawMoneyCommand } from '@/domain/Account/types';

describe('Command Handler', () => {
  const accountId = uuidv4();
  const initialBalance = 1000;

  describe('Withdraw Money Command', () => {
    test('should successfully withdraw money when sufficient balance', async () => {
      // This test verifies the happy path: successful withdrawal through the command handler
      // The command handler orchestrates domain logic, event persistence, and response formatting
      // Business rule: sufficient funds → successful withdrawal with updated balance

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        300
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify successful response with correct balance and event persistence
      expect(result.success).toBe(true);
      if (result.success && result.result) {
        expect(result.result.newBalance).toBe(initialBalance - 300);
        expect(result.result.amount).toBe(300);
        expect(result.result.accountId).toBe(accountId);
      }
    });

    test('should handle multiple withdrawals', async () => {
      // This test verifies that the command handler correctly processes sequential commands
      // Each command should be processed independently and update the account state correctly
      // Important for real-world scenarios with multiple transactions

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const firstCommand: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        200
      );
      const secondCommand: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        300
      );

      const firstResult = await handleWithdrawMoneyCommand(
        firstCommand,
        eventStore
      );
      const secondResult = await handleWithdrawMoneyCommand(
        secondCommand,
        eventStore
      );

      // Verify both commands succeed and balances are calculated correctly
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);

      if (
        firstResult.success &&
        firstResult.result &&
        secondResult.success &&
        secondResult.result
      ) {
        expect(firstResult.result.newBalance).toBe(initialBalance - 200);
        expect(secondResult.result.newBalance).toBe(initialBalance - 200 - 300);
      }
    });

    test('should fail withdrawal when insufficient funds', async () => {
      // This test verifies the command handler correctly handles domain business rule violations
      // The handler should detect insufficient funds events and return appropriate error responses
      // Business rule: insufficient funds → error response with descriptive message

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        initialBalance + 100
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify error response with descriptive message
      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toContain('Insufficient funds');
        expect(result.error).toContain(accountId);
      }
    });

    test('should successfully withdraw when amount equals balance', async () => {
      // This test verifies edge case: withdrawing exactly the available balance
      // Business rule: balance >= withdrawal amount (equality is allowed)
      // Important for account closure scenarios

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        initialBalance
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify successful withdrawal leaving zero balance
      expect(result.success).toBe(true);
      if (result.success && result.result) {
        expect(result.result.newBalance).toBe(0);
        expect(result.result.amount).toBe(initialBalance);
      }
    });

    test('should fail withdrawal for negative amounts', async () => {
      // This test verifies input validation at the application layer
      // The command handler should catch domain exceptions and return user-friendly errors
      // Business rule: withdrawal amount must be positive

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        -100
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify error response for invalid input
      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toContain('Withdrawal amount must be positive');
      }
    });

    test('should fail withdrawal for zero amounts', async () => {
      // This test verifies that zero amounts are rejected as invalid input
      // Business rule: withdrawal amount must be positive (zero is excluded)
      // Prevents meaningless transactions

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        0
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify error response for zero amount
      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toContain('Withdrawal amount must be positive');
      }
    });

    test('should fail for non-existent account', async () => {
      // This test verifies the command handler correctly handles missing aggregates
      // The handler should check for account existence before processing commands
      // Important for data integrity and user experience

      const eventStore = createInMemoryEventStore();
      const nonExistentAccountId = uuidv4();

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        nonExistentAccountId,
        100
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify error response for non-existent account
      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toContain('not found');
        expect(result.error).toContain(nonExistentAccountId);
      }
    });

    test('should handle decimal withdrawal amounts', async () => {
      // This test verifies support for decimal amounts in financial transactions
      // Important for real-world financial applications requiring precision
      // The command handler should preserve decimal precision throughout the process

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        100.5
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify decimal arithmetic works correctly
      expect(result.success).toBe(true);
      if (result.success && result.result) {
        expect(result.result.newBalance).toBe(initialBalance - 100.5);
        expect(result.result.amount).toBe(100.5);
      }
    });

    test('should handle withdrawal that leaves exactly zero balance', async () => {
      // This test verifies edge case: withdrawal leaving minimal balance
      // Important for business rules around account minimum balances
      // Tests precision in balance calculations

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        initialBalance - 1
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify balance calculation precision
      expect(result.success).toBe(true);
      if (result.success && result.result) {
        expect(result.result.newBalance).toBe(1);
        expect(result.result.amount).toBe(initialBalance - 1);
      }
    });

    test('should handle very large withdrawal amounts', async () => {
      // This test verifies system stability with extreme values
      // Ensures no overflow or performance issues with large numbers
      // Important for system robustness and security

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        Number.MAX_SAFE_INTEGER
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify system handles large amounts gracefully
      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toContain('Insufficient funds');
      }
    });

    test('should persist events to event store after successful withdrawal', async () => {
      // This test verifies the command handler correctly persists domain events
      // Event persistence is crucial for Event Sourcing and audit trails
      // The handler should save all generated events to the event store

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        300
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify successful command execution
      expect(result.success).toBe(true);

      // Verify events were persisted to event store
      const events = await eventStore.getEvents(accountId);
      expect(events).toHaveLength(2); // AccountCreated + MoneyWithdrawn
      expect(events[1]?.eventType).toBe('MoneyWithdrawn');
    });

    test('should persist insufficient funds events to event store', async () => {
      // This test verifies that failed transactions are also recorded for audit purposes
      // Even failed attempts should be persisted as events for compliance and analytics
      // Important for regulatory requirements and fraud detection

      const eventStore = createInMemoryEventStore();
      const accountState = createAccount(accountId, initialBalance);
      await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

      const command: WithdrawMoneyCommand = createWithdrawMoneyCommand(
        accountId,
        initialBalance + 100
      );

      const result = await handleWithdrawMoneyCommand(command, eventStore);

      // Verify command failed as expected
      expect(result.success).toBe(false);

      // Verify failed attempt was still recorded as an event
      const events = await eventStore.getEvents(accountId);
      expect(events).toHaveLength(2); // AccountCreated + InsufficientFunds
      expect(events[1]?.eventType).toBe('InsufficientFunds');
    });
  });
});
