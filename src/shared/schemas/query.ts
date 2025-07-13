import { z } from 'zod';

/* Account Balance Query schemas */
export const GetAccountBalanceQuerySchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
});

export const GetAccountBalanceResponseSchema = z.object({
  accountId: z.string().min(1),
  balance: z.number().nonnegative(),
  version: z.number().int().positive(),
  lastUpdated: z.date(),
});

/* All Accounts Query schemas */
export const GetAllAccountsQuerySchema = z.object({
  // No parameters needed for getting all accounts
});

export const GetAllAccountsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      accountId: z.string().min(1),
      balance: z.number().nonnegative(),
      version: z.number().int().positive(),
    })
  ),
  totalCount: z.number().int().nonnegative(),
});

/* Type exports for TypeScript */
export type GetAccountBalanceQuery = z.infer<
  typeof GetAccountBalanceQuerySchema
>;
export type GetAccountBalanceResponse = z.infer<
  typeof GetAccountBalanceResponseSchema
>;

export type GetAllAccountsQuery = z.infer<typeof GetAllAccountsQuerySchema>;
export type GetAllAccountsResponse = z.infer<
  typeof GetAllAccountsResponseSchema
>;
