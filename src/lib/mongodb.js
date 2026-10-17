import mongoose from "mongoose";

/**
 * MongoDB Connection Handler using Mongoose.
 * 
 * In development mode, Next.js clears the Node.js cache on every hot reload,
 * which can lead to multiple database connections being opened.
 * We cache the connection across hot reloads in `global.mongoose`.
 */

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connects to MongoDB Atlas using Mongoose with connection pooling and caching.
 *
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Please define it in your .env.local file."
    );
  }

  // If a cached connection is already established, reuse it
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection promise is not yet pending, create a new one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      })
      .catch((error) => {
        // Reset promise on error so subsequent requests can retry
        cached.promise = null;
        throw new Error(`MongoDB connection failed: ${error.message}`);
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
