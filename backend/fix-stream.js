// Quick script to fix stream status
// Run with: node fix-stream.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const STREAM_ID = '694afc2256294111488f02d5'; // Your stream ID from console

async function fixStream() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Stream = mongoose.model('Stream', new mongoose.Schema({}, { strict: false }));

    // Option 1: Update stream to live status
    const result = await Stream.findByIdAndUpdate(
      STREAM_ID,
      {
        isLive: true,
        status: 'live',
        startedAt: new Date(),
      },
      { new: true }
    );

    console.log('✅ Stream updated:', result);
    
    // Option 2: Or delete it completely
    // await Stream.findByIdAndDelete(STREAM_ID);
    // console.log('✅ Stream deleted');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStream();
