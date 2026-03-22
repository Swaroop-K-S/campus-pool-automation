import http from 'http';
import { app } from './app';
import { env } from './config/env';
import mongoose from 'mongoose';
import { initSocket } from './socket';

const server = http.createServer(app);
initSocket(server);

const PORT = env.PORT || 5000;

const startServer = async () => {
  try {
    // Basic mongoose connection outline (no retry logic yet, simplified for scaffold)
    await mongoose.connect(env.MONGODB_URI);
    console.log(`✅ MongoDB Connected`);
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`❌ Server failed to start:`, error);
    process.exit(1);
  }
};

startServer();
