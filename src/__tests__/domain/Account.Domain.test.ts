import { v4 as uuidv4 } from 'uuid';
import {
  createAccount,
  createEmptyAccountState,
  loadFromHistory,
  withdrawMoney,
} from '@/domain/Account/Account';
import {
  createAccountCreatedEvent,
  createMoneyWithdrawnEvent,
  createInsufficientFundsEvent,
} from '@/domain/Account/Events';

describe('Account Domain', () => {
  const accountId = uuidv4();
  const initialBalance = 1000;

  describe('Account Creation', () => {
    test('should create account with initial balance', () => {
      // This test verifies the core account creation business rule:
      // When creating an account, it should have the specified initial balance
      // and emit an AccountCreated event for audit trail

      const accountState = createAccount(accountId, initialBalance);

      // Verify account state matches business requirements
      expect(accountState.id).toBe(accountId);
      expect(accountState.balance).toBe(initialBalance);
      expect(accountState.version).toBe(0);
      expect(accountState.uncommittedEvents).toHaveLength(1);
      expect(accountState.uncommittedEvents[0]?.eventType).toBe(
        'AccountCreated'
      );
    });

    test('should create empty account state', () => {
      // This test verifies the factory function for creating empty account states
      // Used when reconstructing account state from event history

      const emptyState = createEmptyAccountState(accountId);

      // Empty state should have zero balance and no uncommitted events
      expect(emptyState.id).toBe(accountId);
      expect(emptyState.balance).toBe(0);
      expect(emptyState.version).toBe(0);
      expect(emptyState.uncommittedEvents).toHaveLength(0);
    });
  });

  describe('Money Withdrawal', () => {
    test('should successfully withdraw money when sufficient balance', () => {
      // This test verifies the happy path: successful withdrawal when sufficient funds
      // Business rule: balance >= withdrawal amount → allow withdrawal and emit MoneyWithdrawn event

      const accountState = createAccount(accountId, initialBalance);
      const withdrawalAmount = 300;

      const newState = withdrawMoney(accountState, withdrawalAmount);

      // Verify balance is reduced and MoneyWithdrawn event is emitted
      expect(newState.balance).toBe(initialBalance - withdrawalAmount);
      expect(newState.version).toBe(1);
      expect(newState.uncommittedEvents).toHaveLength(2); // AccountCreated + MoneyWithdrawn
      expect(newState.uncommittedEvents[1]?.eventType).toBe('MoneyWithdrawn');
    });

    test('should handle multiple withdrawals', () => {
      // This test verifies that multiple withdrawals work correctly
      // Each withdrawal should reduce the balance and emit a separate event

      const accountState = createAccount(accountId, initialBalance);
      const firstWithdrawal = 200;
      const secondWithdrawal = 300;

      const afterFirstWithdrawal = withdrawMoney(accountState, firstWithdrawal);
      const afterSecondWithdrawal = withdrawMoney(
        afterFirstWithdrawal,
        secondWithdrawal
      );

      // Verify cumulative effect of multiple withdrawals
      expect(afterFirstWithdrawal.balance).toBe(
        initialBalance - firstWithdrawal
      );
      expect(afterSecondWithdrawal.balance).toBe(
        initialBalance - firstWithdrawal - secondWithdrawal
      );
      expect(afterSecondWithdrawal.uncommittedEvents).toHaveLength(3); // AccountCreated + 2 MoneyWithdrawn
    });

    test('should emit insufficient funds event when withdrawal exceeds balance', () => {
      // This test verifies the business rule for insufficient funds
      // Business rule: balance < withdrawal amount → reject withdrawal and emit InsufficientFunds event

      const accountState = createAccount(accountId, initialBalance);
      const excessiveAmount = initialBalance + 100;

      const newState = withdrawMoney(accountState, excessiveAmount);

      // Verify balance remains unchanged and InsufficientFunds event is emitted
      expect(newState.balance).toBe(initialBalance);
      expect(newState.uncommittedEvents).toHaveLength(2); // AccountCreated + InsufficientFunds
      expect(newState.uncommittedEvents[1]?.eventType).toBe(
        'InsufficientFunds'
      );
    });

    test('should successfully withdraw when amount equals balance', () => {
      // This test verifies that withdrawing the exact balance amount is allowed
      // Business rule: balance >= withdrawal amount (equality is included)

      const accountState = createAccount(accountId, initialBalance);
      const exactAmount = initialBalance;

      const newState = withdrawMoney(accountState, exactAmount);

      // Verify balance becomes zero and MoneyWithdrawn event is emitted
      expect(newState.balance).toBe(0);
      expect(newState.uncommittedEvents).toHaveLength(2); // AccountCreated + MoneyWithdrawn
      expect(newState.uncommittedEvents[1]?.eventType).toBe('MoneyWithdrawn');
    });

    test('should throw error for negative withdrawal amounts', () => {
      // This test verifies input validation: negative amounts are not allowed
      // Business rule: withdrawal amount must be positive

      const accountState = createAccount(accountId, initialBalance);
      const negativeAmount = -100;

      expect(() => withdrawMoney(accountState, negativeAmount)).toThrow(
        'Withdrawal amount must be positive'
      );
    });

    test('should throw error for zero withdrawal amounts', () => {
      // This test verifies input validation: zero amounts are not allowed
      // Business rule: withdrawal amount must be positive (zero is excluded)

      const accountState = createAccount(accountId, initialBalance);
      const zeroAmount = 0;

      expect(() => withdrawMoney(accountState, zeroAmount)).toThrow(
        'Withdrawal amount must be positive'
      );
    });
  });

  describe('Event History Reconstruction', () => {
    test('should reconstruct account state from event history', () => {
      // This test verifies the core Event Sourcing principle:
      // Account state can be reconstructed by replaying all events in order
      // This enables audit trails and temporal queries

      const events = [
        createAccountCreatedEvent(accountId, { accountId, initialBalance }, 0),
        createMoneyWithdrawnEvent(
          accountId,
          { accountId, amount: 200, newBalance: 800 },
          1
        ),
        createMoneyWithdrawnEvent(
          accountId,
          { accountId, amount: 300, newBalance: 500 },
          2
        ),
      ];

      const initialState = createEmptyAccountState(accountId);
      const reconstructedState = loadFromHistory(initialState, events);

      // Verify state is correctly reconstructed from events
      expect(reconstructedState.id).toBe(accountId);
      expect(reconstructedState.balance).toBe(500);
      expect(reconstructedState.version).toBe(2); // Version matches last event
      expect(reconstructedState.uncommittedEvents).toHaveLength(0); // No new events
    });

    test('should handle empty event history', () => {
      // This test verifies edge case: account with no events
      // Should return empty state (useful for new accounts)

      const initialState = createEmptyAccountState(accountId);
      const reconstructedState = loadFromHistory(initialState, []);

      // Verify empty state is returned
      expect(reconstructedState.id).toBe(accountId);
      expect(reconstructedState.balance).toBe(0);
      expect(reconstructedState.version).toBe(0);
    });

    test('should handle event history with insufficient funds events', () => {
      // This test verifies that InsufficientFunds events don't change account state
      // They are recorded for audit purposes but don't affect balance

      const events = [
        createAccountCreatedEvent(accountId, { accountId, initialBalance }, 0),
        createMoneyWithdrawnEvent(
          accountId,
          { accountId, amount: 200, newBalance: 800 },
          1
        ),
        createInsufficientFundsEvent(
          accountId,
          { accountId, requestedAmount: 1000, currentBalance: 800 },
          2
        ),
      ];

      const initialState = createEmptyAccountState(accountId);
      const reconstructedState = loadFromHistory(initialState, events);

      // Verify balance unchanged after insufficient funds event
      expect(reconstructedState.balance).toBe(800);
      expect(reconstructedState.version).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle withdrawal that leaves exactly zero balance', () => {
      // This test verifies edge case: withdrawal leaving exactly zero balance
      // Important for business rules around account closure

      const accountState = createAccount(accountId, initialBalance);
      const withdrawalAmount = initialBalance - 1; // Leave 1 unit

      const newState = withdrawMoney(accountState, withdrawalAmount);

      // Verify balance is exactly 1 (not zero)
      expect(newState.balance).toBe(1);
      expect(newState.uncommittedEvents).toHaveLength(2); // AccountCreated + MoneyWithdrawn
      expect(newState.uncommittedEvents[1]?.eventType).toBe('MoneyWithdrawn');
    });

    test('should handle very large withdrawal amounts', () => {
      // This test verifies system stability with extreme values
      // Ensures no overflow or performance issues with large numbers

      const accountState = createAccount(accountId, initialBalance);

      const newState = withdrawMoney(accountState, Number.MAX_SAFE_INTEGER);

      // Verify system handles large amounts gracefully
      expect(newState.balance).toBe(initialBalance); // Balance unchanged
      expect(newState.uncommittedEvents).toHaveLength(2); // AccountCreated + InsufficientFunds
      expect(newState.uncommittedEvents[1]?.eventType).toBe(
        'InsufficientFunds'
      );
    });

    test('should handle decimal withdrawal amounts', () => {
      // This test verifies support for decimal amounts
      // Important for financial applications requiring precision

      const accountState = createAccount(accountId, initialBalance);
      const decimalAmount = 100.5;

      const newState = withdrawMoney(accountState, decimalAmount);

      // Verify decimal arithmetic works correctly
      expect(newState.balance).toBe(initialBalance - decimalAmount);
      expect(newState.uncommittedEvents).toHaveLength(2); // AccountCreated + MoneyWithdrawn
      expect(newState.uncommittedEvents[1]?.eventType).toBe('MoneyWithdrawn');
    });
  });
});
