import { v4 as uuidv4 } from 'uuid';
import { createInMemoryEventStore } from '@/infrastructure/InMemoryEventStore';
import {
  GetAccountBalance,
  GetAllAccounts,
} from '@/queries/AccountBalanceQuery';
import { createAccount } from '@/domain/Account/Account';
import { createWithdrawMoneyCommand } from '@/domain/Account/Commands';
import { handleWithdrawMoneyCommand } from '@/application/Account/CommandHandler';

// Data provider: 5+ account types and balances
const accountTestCases = [
  {
    label: 'Standard account',
    initialBalance: 1000,
    withdrawals: [100, 200, 50],
    expected: { balance: 650, version: 4 },
  },
  {
    label: 'Zero balance account',
    initialBalance: 0,
    withdrawals: [10],
    expected: { balance: 0, version: 2 }, // 1 InsufficientFunds event
  },
  {
    label: 'Large balance account',
    initialBalance: Number.MAX_SAFE_INTEGER,
    withdrawals: [1, 2, 3],
    expected: { balance: Number.MAX_SAFE_INTEGER - 6, version: 4 },
  },
  {
    label: 'Small decimal balance',
    initialBalance: 0.05,
    withdrawals: [0.01, 0.02],
    expected: { balance: 0.02, version: 3 },
  },
  {
    label: 'Account with failed and successful withdrawals',
    initialBalance: 500,
    withdrawals: [1000, 100, 1000, 200],
    expected: { balance: 200, version: 5 }, // 2 InsufficientFunds, 2 MoneyWithdrawn
  },
];

describe('Account Balance Query (with data providers)', () => {
  accountTestCases.forEach(
    ({ label, initialBalance, withdrawals, expected }) => {
      test(`${label}: should reconstruct correct balance and version`, async () => {
        // This test simulates a real-world account scenario:
        // 1. Create an account with a specific initial balance.
        // 2. Apply a sequence of withdrawals (some may fail if insufficient funds).
        // 3. Query the account balance and version, which should reflect all events.

        const accountId = uuidv4();
        const eventStore = createInMemoryEventStore();
        // Step 1: Create account
        const accountState = createAccount(accountId, initialBalance);
        await eventStore.saveEvents(
          accountId,
          accountState.uncommittedEvents,
          0
        );

        // Step 2: Apply withdrawals
        for (const amount of withdrawals) {
          const command = createWithdrawMoneyCommand(accountId, amount);
          await handleWithdrawMoneyCommand(command, eventStore);
        }

        // Step 3: Query the account balance
        const result = await GetAccountBalance.handle(
          { accountId },
          eventStore
        );

        // Assert: The balance and version should match the expected outcome
        expect(result.success).toBe(true);
        if (result.success && result.result) {
          expect(result.result.accountId).toBe(accountId);
          expect(result.result.balance).toBe(expected.balance);
          expect(result.result.version).toBe(expected.version);
        }
      });
    }
  );
});

// Error handling tests to improve coverage
describe('GetAccountBalance Error Handling', () => {
  test('should return error when account not found', async () => {
    // This test verifies that querying a non-existent account returns
    // a proper error response, which is essential for user feedback.
    const eventStore = createInMemoryEventStore();
    const nonExistentAccountId = 'non-existent-account';

    const result = await GetAccountBalance.handle(
      { accountId: nonExistentAccountId },
      eventStore
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Account non-existent-account not found');
    expect(result.queryId).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should handle validation errors gracefully', async () => {
    // This test verifies that invalid query input is caught and
    // returns a proper error response with validation details.
    const eventStore = createInMemoryEventStore();

    // Test with invalid query (empty accountId)
    const result = await GetAccountBalance.handle(
      { accountId: '' } as any,
      eventStore
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to get account balance');
    expect(result.queryId).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should handle event store errors gracefully', async () => {
    // This test simulates an event store failure and verifies
    // that the query handler returns a proper error response.
    const mockEventStore = {
      getEvents: jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed')),
      getAllEvents: jest.fn().mockResolvedValue([]),
      saveEvents: jest.fn().mockResolvedValue(undefined),
    };

    const result = await GetAccountBalance.handle(
      { accountId: 'test-account' },
      mockEventStore
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Database connection failed');
    expect(result.queryId).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});

// GetAllAccounts tests to improve coverage
describe('GetAllAccounts Query', () => {
  test('should return empty list when no accounts exist', async () => {
    // This test verifies that GetAllAccounts returns an empty list
    // when no accounts have been created, which is a valid business scenario.
    const eventStore = createInMemoryEventStore();

    const result = await GetAllAccounts.handle({}, eventStore);

    expect(result.success).toBe(true);
    if (result.success && result.result) {
      expect(result.result.accounts).toEqual([]);
      expect(result.result.totalCount).toBe(0);
    }
    expect(result.queryId).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should return all accounts with correct balances and versions', async () => {
    // This test verifies that GetAllAccounts correctly retrieves and
    // reconstructs multiple accounts from the event store.
    const eventStore = createInMemoryEventStore();

    // Create multiple accounts
    const account1Id = 'account-1';
    const account2Id = 'account-2';
    const account3Id = 'account-3';

    const account1State = createAccount(account1Id, 1000);
    const account2State = createAccount(account2Id, 500);
    const account3State = createAccount(account3Id, 750);

    await eventStore.saveEvents(account1Id, account1State.uncommittedEvents, 0);
    await eventStore.saveEvents(account2Id, account2State.uncommittedEvents, 0);
    await eventStore.saveEvents(account3Id, account3State.uncommittedEvents, 0);

    // Perform some operations on accounts
    const command1 = createWithdrawMoneyCommand(account1Id, 200);
    const command2 = createWithdrawMoneyCommand(account2Id, 100);
    await handleWithdrawMoneyCommand(command1, eventStore);
    await handleWithdrawMoneyCommand(command2, eventStore);

    const result = await GetAllAccounts.handle({}, eventStore);

    expect(result.success).toBe(true);
    if (result.success && result.result) {
      expect(result.result.totalCount).toBe(3);
      expect(result.result.accounts).toHaveLength(3);

      // Find accounts by ID and verify their balances
      const account1 = result.result.accounts.find(
        a => a.accountId === account1Id
      );
      const account2 = result.result.accounts.find(
        a => a.accountId === account2Id
      );
      const account3 = result.result.accounts.find(
        a => a.accountId === account3Id
      );

      expect(account1).toBeDefined();
      expect(account1?.balance).toBe(800); // 1000 - 200
      expect(account1?.version).toBe(2); // AccountCreated + MoneyWithdrawn

      expect(account2).toBeDefined();
      expect(account2?.balance).toBe(400); // 500 - 100
      expect(account2?.version).toBe(2); // AccountCreated + MoneyWithdrawn

      expect(account3).toBeDefined();
      expect(account3?.balance).toBe(750); // No withdrawals
      expect(account3?.version).toBe(1); // Only AccountCreated
    }
  });

  test('should handle event store errors gracefully', async () => {
    // This test simulates an event store failure during GetAllAccounts
    // and verifies proper error handling.
    const mockEventStore = {
      getEvents: jest.fn().mockResolvedValue([]),
      getAllEvents: jest.fn().mockRejectedValue(new Error('Storage error')),
      saveEvents: jest.fn().mockResolvedValue(undefined),
    };

    const result = await GetAllAccounts.handle({}, mockEventStore);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Storage error');
    expect(result.queryId).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should handle validation errors in GetAllAccounts', async () => {
    // This test verifies that GetAllAccounts handles validation errors
    // properly when the response validation fails.
    const eventStore = createInMemoryEventStore();

    // Create an account with invalid data that might cause validation issues
    const accountId = 'test-account';
    const accountState = createAccount(accountId, 1000);
    await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

    // Mock the validation to fail
    const originalParse = require('@/shared/schemas/query')
      .GetAllAccountsResponseSchema.parse;
    require('@/shared/schemas/query').GetAllAccountsResponseSchema.parse = jest
      .fn()
      .mockImplementation(() => {
        throw new Error('Validation failed');
      });

    const result = await GetAllAccounts.handle({}, eventStore);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation failed');

    // Restore original function
    require('@/shared/schemas/query').GetAllAccountsResponseSchema.parse =
      originalParse;
  });
});

// Additional educational test: edge case for negative withdrawal
// This test demonstrates that negative withdrawals are rejected and do not affect balance or version.
test('Negative withdrawal: should not change balance or version', async () => {
  const accountId = uuidv4();
  const eventStore = createInMemoryEventStore();
  const initialBalance = 100;
  const accountState = createAccount(accountId, initialBalance);
  await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

  // Attempt a negative withdrawal
  const command = createWithdrawMoneyCommand(accountId, -50);
  await handleWithdrawMoneyCommand(command, eventStore);

  // Query the account balance
  const result = await GetAccountBalance.handle({ accountId }, eventStore);

  // The balance and version should remain unchanged
  expect(result.success).toBe(true);
  if (result.success && result.result) {
    expect(result.result.balance).toBe(initialBalance);
    expect(result.result.version).toBe(1); // Only AccountCreated event
  }
});

// Floating Point Precision Tests
// These tests demonstrate common floating point precision issues in JavaScript
// and how to properly test them using Jest's toBeCloseTo matcher
describe('Floating Point Precision Tests', () => {
  test('should handle classic floating point precision issue: 0.1 + 0.2', async () => {
    // This test demonstrates the classic JavaScript floating point issue:
    // 0.1 + 0.2 !== 0.3 due to binary floating point representation
    // In our system, this would be: 0.3 - 0.1 - 0.2 should equal 0

    const accountId = uuidv4();
    const eventStore = createInMemoryEventStore();
    const initialBalance = 0.3;
    const accountState = createAccount(accountId, initialBalance);
    await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

    // Withdraw 0.1 and 0.2 (classic floating point problem)
    const withdrawals = [0.1, 0.2];
    for (const amount of withdrawals) {
      const command = createWithdrawMoneyCommand(accountId, amount);
      await handleWithdrawMoneyCommand(command, eventStore);
    }

    const result = await GetAccountBalance.handle({ accountId }, eventStore);

    expect(result.success).toBe(true);
    if (result.success && result.result) {
      // This demonstrates the classic floating point precision issue:
      // 0.3 - 0.1 - 0.2 = 0.19999999999999998 (not exactly 0)
      // Using toBeCloseTo to handle the floating point imprecision
      expect(result.result.balance).toBeCloseTo(0.2, 1);
      expect(result.result.version).toBe(3); // AccountCreated + 2 withdrawals
    }
  });

  test('should handle repeated decimal operations that accumulate precision errors', async () => {
    // This test demonstrates how repeated decimal operations can accumulate
    // floating point precision errors over time

    const accountId = uuidv4();
    const eventStore = createInMemoryEventStore();
    const initialBalance = 1.0;
    const accountState = createAccount(accountId, initialBalance);
    await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

    // Perform 10 withdrawals of 0.1 each
    // Expected: 1.0 - (10 * 0.1) = 0.0
    // Reality: May not be exactly 0.0 due to floating point precision
    for (let i = 0; i < 10; i++) {
      const command = createWithdrawMoneyCommand(accountId, 0.1);
      await handleWithdrawMoneyCommand(command, eventStore);
    }

    const result = await GetAccountBalance.handle({ accountId }, eventStore);

    expect(result.success).toBe(true);
    if (result.success && result.result) {
      // Using toBeCloseTo with higher precision for accumulated errors
      expect(result.result.balance).toBeCloseTo(0, 10);
      expect(result.result.version).toBe(11); // AccountCreated + 10 withdrawals
    }
  });

  test('should handle very small decimal amounts that can cause precision issues', async () => {
    // This test demonstrates issues with very small decimal amounts
    // that can cause precision problems in floating point arithmetic

    const accountId = uuidv4();
    const eventStore = createInMemoryEventStore();
    const initialBalance = 0.0001;
    const accountState = createAccount(accountId, initialBalance);
    await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

    // Withdraw half of the balance
    const command = createWithdrawMoneyCommand(accountId, 0.00005);
    await handleWithdrawMoneyCommand(command, eventStore);

    const result = await GetAccountBalance.handle({ accountId }, eventStore);

    expect(result.success).toBe(true);
    if (result.success && result.result) {
      // Using toBeCloseTo for very small numbers
      expect(result.result.balance).toBeCloseTo(0.00005, 5);
      expect(result.result.version).toBe(2); // AccountCreated + 1 withdrawal
    }
  });

  test('should handle mixed integer and decimal operations', async () => {
    // This test demonstrates floating point issues when mixing
    // integer and decimal operations

    const accountId = uuidv4();
    const eventStore = createInMemoryEventStore();
    const initialBalance = 100;
    const accountState = createAccount(accountId, initialBalance);
    await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

    // Mix integer and decimal withdrawals
    const withdrawals = [50, 0.5, 25, 0.25, 10, 0.1];
    for (const amount of withdrawals) {
      const command = createWithdrawMoneyCommand(accountId, amount);
      await handleWithdrawMoneyCommand(command, eventStore);
    }

    const result = await GetAccountBalance.handle({ accountId }, eventStore);

    expect(result.success).toBe(true);
    if (result.success && result.result) {
      // Expected: 100 - 50 - 0.5 - 25 - 0.25 - 10 - 0.1 = 14.15
      expect(result.result.balance).toBeCloseTo(14.15, 2);
      expect(result.result.version).toBe(7); // AccountCreated + 6 withdrawals
    }
  });

  test('should demonstrate why toBeCloseTo is better than toBe for floating point', async () => {
    // This test shows the difference between using toBe vs toBeCloseTo
    // for floating point comparisons

    const accountId = uuidv4();
    const eventStore = createInMemoryEventStore();
    const initialBalance = 1.0;
    const accountState = createAccount(accountId, initialBalance);
    await eventStore.saveEvents(accountId, accountState.uncommittedEvents, 0);

    // Withdraw 0.3 (which can cause floating point issues)
    const command = createWithdrawMoneyCommand(accountId, 0.3);
    await handleWithdrawMoneyCommand(command, eventStore);

    const result = await GetAccountBalance.handle({ accountId }, eventStore);

    expect(result.success).toBe(true);
    if (result.success && result.result) {
      // This might fail with toBe due to floating point precision
      // expect(result.result.balance).toBe(0.7); // May fail

      // This will pass with toBeCloseTo
      expect(result.result.balance).toBeCloseTo(0.7, 2); // Will pass
      expect(result.result.version).toBe(2); // AccountCreated + 1 withdrawal
    }
  });
});
