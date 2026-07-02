import { Prisma } from "@prisma/client";

export function getDatabaseErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "PostgreSQL is not reachable. Start your database and run Prisma migrations to load live league data.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return "The database request failed. Check your Prisma schema and migration state.";
  }

  return "The database is unavailable right now. Check your DATABASE_URL and PostgreSQL server.";
}
