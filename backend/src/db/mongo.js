import { MongoClient, ServerApiVersion } from 'mongodb';
import config from '../config/index.js';

let client = null;
let db = null;

export async function connectMongo() {
  if (db) return db;
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  client = new MongoClient(config.mongoUri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  db = client.db(config.mongoDbName);
  await db.command({ ping: 1 });
  console.log(`[MongoDB] Connected to database "${config.mongoDbName}"`);
  return db;
}

export function getMongoDb() {
  if (!db) throw new Error('MongoDB not connected. Call connectMongo() first.');
  return db;
}

export async function closeMongo() {
  if (client) await client.close();
  client = null;
  db = null;
}
