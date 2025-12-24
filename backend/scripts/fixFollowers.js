import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const userSchema = new mongoose.Schema({
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const u1 = '69007ef14a79600ddd942c90'; // user1
    const u2 = '6900a2c6891ae298e09d2bf6'; // user2
    const u3 = '69086277d2cb385b6a7d9269'; // user3

    // user1 following user2 and user3
    await User.findByIdAndUpdate(u1, { $set: { following: [u2, u3] } });
    await User.findByIdAndUpdate(u2, { $set: { followers: [u1] } });
    await User.findByIdAndUpdate(u3, { $set: { followers: [u1] } });

    // user2 following user1
    await User.findByIdAndUpdate(u2, { $addToSet: { following: u1 } });
    await User.findByIdAndUpdate(u1, { $addToSet: { followers: u2 } });

    console.log('Follow relationships created successfully!');
    
    const users = await User.find({ _id: { $in: [u1, u2, u3] } });
    users.forEach(u => {
      console.log(`User ${u._id}: Following count: ${u.following.length}, Followers count: ${u.followers.length}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
