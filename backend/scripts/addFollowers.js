import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Define User schema inline
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide valid email"],
      trim: true,
    },
    hashedPassword: {
      type: String,
      required: true,
      minlength: 6,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: String,
    bio: String,
    streamKey: {
      type: String,
      unique: true,
      required: true,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    totalViews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

const addFollowers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // User IDs from your database
    const user1Id = '69007ef14a79600ddd942c90';
    const user2Id = '6900a2c6891ae298e09d2bf6';
    const user3Id = '69086277d2cb385b6a7d9269';

    // Fetch users
    const user1 = await User.findById(user1Id);
    const user2 = await User.findById(user2Id);
    const user3 = await User.findById(user3Id);

    if (!user1 || !user2 || !user3) {
      console.error('❌ Không tìm thấy một hoặc nhiều users');
      console.log('user1:', user1 ? '✓' : '✗');
      console.log('user2:', user2 ? '✓' : '✗');
      console.log('user3:', user3 ? '✓' : '✗');
      process.exit(1);
    }

    console.log(`\n📋 Users hiện tại:`);
    console.log(`- ${user1.username} (${user1.displayName})`);
    console.log(`- ${user2.username} (${user2.displayName})`);
    console.log(`- ${user3.username} (${user3.displayName})`);

    // Clear existing followers/following (optional - để đảm bảo clean state)
    console.log('\n🧹 Clearing existing followers/following...');
    user1.followers = [];
    user1.following = [];
    user2.followers = [];
    user2.following = [];
    user3.followers = [];
    user3.following = [];

    // Create follow relationships
    console.log('\n👥 Creating follow relationships...');

    // user1 follows user2
    if (!user1.following.includes(user2Id)) {
      user1.following.push(user2Id);
      user2.followers.push(user1Id);
      console.log(`✓ ${user1.username} → follows → ${user2.username}`);
    }

    // user1 follows user3
    if (!user1.following.includes(user3Id)) {
      user1.following.push(user3Id);
      user3.followers.push(user1Id);
      console.log(`✓ ${user1.username} → follows → ${user3.username}`);
    }

    // user2 follows user1
    if (!user2.following.includes(user1Id)) {
      user2.following.push(user1Id);
      user1.followers.push(user2Id);
      console.log(`✓ ${user2.username} → follows → ${user1.username}`);
    }

    // user3 follows user2
    if (!user3.following.includes(user2Id)) {
      user3.following.push(user2Id);
      user2.followers.push(user3Id);
      console.log(`✓ ${user3.username} → follows → ${user2.username}`);
    }

    // Save all users
    await Promise.all([
      user1.save(),
      user2.save(),
      user3.save()
    ]);

    console.log('\n✅ Đã tạo followers thành công!');
    
    // Display final state
    console.log('\n📊 Kết quả:');
    console.log(`\n${user1.username}:`);
    console.log(`  - Followers: ${user1.followers.length}`);
    console.log(`  - Following: ${user1.following.length}`);
    
    console.log(`\n${user2.username}:`);
    console.log(`  - Followers: ${user2.followers.length}`);
    console.log(`  - Following: ${user2.following.length}`);
    
    console.log(`\n${user3.username}:`);
    console.log(`  - Followers: ${user3.followers.length}`);
    console.log(`  - Following: ${user3.following.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

addFollowers();
