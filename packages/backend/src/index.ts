import http from 'http';
import { app } from './app';
import { env } from './config/env';
import mongoose from 'mongoose';
import { initSocket } from './socket';


const server = http.createServer(app);

const PORT = env.PORT || 5000;

const startServer = async () => {
  try {
    // Basic mongoose connection outline (no retry logic yet, simplified for scaffold)
    await mongoose.connect(env.MONGODB_URI);
    console.log(`✅ MongoDB Connected`);
    
    // Auto-close scheduler
    setInterval(async () => {
      const now = new Date();
      if (!mongoose.connection.db) return;

      // Find all drives whose form should be closed but aren't yet
      await mongoose.connection.db.collection('drives').updateMany(
        {
          formStatus: { $in: ['open', 'extended', 'scheduled'] },
          formCloseDate: { $lt: now, $ne: null }
        },
        { $set: { formStatus: 'closed' } }
      );
      
      // Also open scheduled forms
      await mongoose.connection.db.collection('drives').updateMany(
        {
          formStatus: 'scheduled',
          formOpenDate: { $lte: now }
        },
        { $set: { formStatus: 'open' } }
      );
    }, 60000); // every 60 seconds

    await initSocket(server);
    console.log('⏰ Form auto-close scheduler started');

    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
      console.log(`📡 Network access: http://172.17.66.59:${PORT}`);
    });
  } catch (error) {
    console.error(`❌ Server failed to start:`, error);
    process.exit(1);
  }
};

startServer();
