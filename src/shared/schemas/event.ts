import { z } from 'zod';

/* Account Created Event schemas */
export const AccountCreatedEventDataSchema = z.object({
  accountId: z.string().min(1),
  initialBalance: z.number().nonnegative(),
});

export const AccountCreatedEventSchema = z.object({
  eventId: z.uuid(),
  aggregateId: z.string().min(1),
  eventType: z.literal('AccountCreated'),
  eventData: AccountCreatedEventDataSchema,
  timestamp: z.date(),
  version: z.number().int().positive(),
});

/* Money Withdrawn Event schemas */
export const MoneyWithdrawnEventDataSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  newBalance: z.number().nonnegative(),
});

export const MoneyWithdrawnEventSchema = z.object({
  eventId: z.uuid(),
  aggregateId: z.string().min(1),
  eventType: z.literal('MoneyWithdrawn'),
  eventData: MoneyWithdrawnEventDataSchema,
  timestamp: z.date(),
  version: z.number().int().positive(),
});

/* Insufficient Funds Event schemas */
export const InsufficientFundsEventDataSchema = z.object({
  accountId: z.string().min(1),
  requestedAmount: z.number().positive(),
  currentBalance: z.number().nonnegative(),
});

export const InsufficientFundsEventSchema = z.object({
  eventId: z.uuid(),
  aggregateId: z.string().min(1),
  eventType: z.literal('InsufficientFunds'),
  eventData: InsufficientFundsEventDataSchema,
  timestamp: z.date(),
  version: z.number().int().positive(),
});

/* Type exports for TypeScript */
export type AccountCreatedEventData = z.infer<
  typeof AccountCreatedEventDataSchema
>;
export type MoneyWithdrawnEventData = z.infer<
  typeof MoneyWithdrawnEventDataSchema
>;
export type InsufficientFundsEventData = z.infer<
  typeof InsufficientFundsEventDataSchema
>;

export type AccountCreatedEvent = z.infer<typeof AccountCreatedEventSchema>;
export type MoneyWithdrawnEvent = z.infer<typeof MoneyWithdrawnEventSchema>;
export type InsufficientFundsEvent = z.infer<
  typeof InsufficientFundsEventSchema
>;
