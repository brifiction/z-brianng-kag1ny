import { z } from 'zod';

/* Create Account Command schemas */
export const CreateAccountCommandSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  initialBalance: z
    .number()
    .nonnegative('Initial balance must be non-negative'),
});

export const CreateAccountResponseSchema = z.object({
  accountId: z.string().min(1),
  initialBalance: z.number().nonnegative(),
  version: z.number().int().positive(),
});

/* Withdraw Money Command schemas */
export const WithdrawMoneyCommandSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  amount: z.number().positive('Withdrawal amount must be positive'),
});

export const WithdrawMoneyResponseSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  newBalance: z.number().nonnegative(),
  version: z.number().int().positive(),
});

/* Type exports for TypeScript */
export type CreateAccountCommand = z.infer<typeof CreateAccountCommandSchema>;
export type CreateAccountResponse = z.infer<typeof CreateAccountResponseSchema>;

export type WithdrawMoneyCommand = z.infer<typeof WithdrawMoneyCommandSchema>;
export type WithdrawMoneyResponse = z.infer<typeof WithdrawMoneyResponseSchema>;
