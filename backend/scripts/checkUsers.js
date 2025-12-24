import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const userSchema = new mongoose.Schema({
  username: String,
  displayName: String,
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const users = await User.find({}).select('username displayName followers following');
    console.log('--- ALL USERS ---');
    users.forEach(u => {
      console.log(`ID: ${u._id}`);
      console.log(`Username: ${u.username}`);
      console.log(`Following: ${u.following.length}`);
      console.log(`Followers: ${u.followers.length}`);
      console.log('-----------------');
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
