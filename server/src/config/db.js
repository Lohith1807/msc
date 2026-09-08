import mongoose from 'mongoose';
import dns from 'dns';

// Ensure DNS SRV resolution succeeds for mongodb+srv on Windows/Node environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('Could not set custom DNS servers:', dnsErr.message);
}

let cachedPromise = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables. Please configure MONGO_URI in .env.');
  }

  const isSrv = uri.startsWith('mongodb+srv://');

  console.log(`Connecting to MongoDB Atlas at: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
  
  cachedPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: isSrv ? 15000 : 5000,
  }).then((conn) => {
    console.log(`✅ Connected to MongoDB Atlas successfully! Active Database: "${mongoose.connection.name}"`);
    return conn;
  }).catch((err) => {
    cachedPromise = null;
    throw err;
  });

  return cachedPromise;
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
