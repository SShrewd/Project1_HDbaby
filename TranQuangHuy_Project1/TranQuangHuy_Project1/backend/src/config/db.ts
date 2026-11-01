import { PrismaClient, Prisma } from '@prisma/client';
export const db = new PrismaClient();
export type Transaction = Prisma.TransactionClient;
export async function transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++)
    try {
      return await db.$transaction(fn, {
        isolationLevel: 'Serializable',
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < 3
      )
        continue;
      throw error;
    }
  throw Error('Transaction retry exhausted');
}
