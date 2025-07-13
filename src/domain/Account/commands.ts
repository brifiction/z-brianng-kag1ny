import { v4 as uuidv4 } from 'uuid';
import { startOfSecond } from 'date-fns';
import type { CreateAccountCommand, WithdrawMoneyCommand } from './types';

// Factory function for creating CreateAccountCommand
export const createCreateAccountCommand = (
  accountId: string,
  initialBalance: number
): CreateAccountCommand => ({
  commandId: uuidv4(),
  aggregateId: accountId,
  timestamp: startOfSecond(new Date()),
  commandType: 'CreateAccount',
  commandData: {
    accountId,
    initialBalance,
  },
});

// Factory function for creating WithdrawMoneyCommand
export const createWithdrawMoneyCommand = (
  accountId: string,
  amount: number
): WithdrawMoneyCommand => ({
  commandId: uuidv4(),
  aggregateId: accountId,
  timestamp: startOfSecond(new Date()),
  commandType: 'WithdrawMoney',
  commandData: {
    accountId,
    amount,
  },
});
