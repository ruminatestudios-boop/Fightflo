import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | null;
  mongoDb: Db | null;
};

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function getDb(): Promise<Db | null> {
  const uri = process.env.DATABASE_URL;
  if (!uri) return null;

  if (globalForMongo.mongoDb) return globalForMongo.mongoDb;

  const client =
    globalForMongo.mongoClient ??
    new MongoClient(uri, { maxPoolSize: 10 });

  if (!globalForMongo.mongoClient) {
    await client.connect();
    globalForMongo.mongoClient = client;
  }

  const dbName = process.env.MONGODB_DB_NAME ?? "fightflo";
  globalForMongo.mongoDb = client.db(dbName);
  return globalForMongo.mongoDb;
}
