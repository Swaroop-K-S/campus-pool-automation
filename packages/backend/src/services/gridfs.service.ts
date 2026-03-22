import mongoose from 'mongoose';

let gridfsBucket: any;

export const getGridFSBucket = () => {
  if (!gridfsBucket) {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    gridfsBucket = new mongoose.mongo.GridFSBucket(db as any, {
      bucketName: 'uploads'
    });
  }
  return gridfsBucket;
};
