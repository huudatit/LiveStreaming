import User from "../models/User.js";

// @desc    Get user profile by username
// @route   GET /api/users/:username
// @access  Public
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("-hashedPassword -streamKey")
      .populate("followers", "username displayName avatar")
      .populate("following", "username displayName avatar");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        followersCount: user.followers.length,
        followingCount: user.following.length,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin người dùng",
    });
  }
};

// @desc    Follow/Unfollow user
// @route   POST /api/users/:userId/follow
// @access  Private
export const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể follow chính mình",
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Check if already following
    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length,
      message: isFollowing ? "Đã bỏ theo dõi" : "Đã theo dõi",
    });
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thực hiện hành động",
    });
  }
};

// @desc    Update user profile
// @route   PATCH /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName, bio, avatar } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Update fields
    if (displayName) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        followersCount: user.followers.length,
        followingCount: user.following.length,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin",
    });
  }
};

// @desc    Check if current user is following target user
// @route   GET /api/users/:userId/is-following
// @access  Private
export const checkIsFollowing = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);

    const isFollowing = currentUser.following.includes(targetUserId);

    res.json({
      success: true,
      isFollowing,
    });
  } catch (error) {
    console.error("Check following error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra trạng thái follow",
    });
  }
};

// @desc    Get list of channels user is following
// @route   GET /api/users/following/channels
// @access  Private
export const getFollowingChannels = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const user = await User.findById(currentUserId).populate({
      path: "following",
      select: "username displayName avatar isLive",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Trả về danh sách kênh đang follow
    const channels = user.following.map((channel) => ({
      _id: channel._id,
      username: channel.username,
      displayName: channel.displayName,
      avatar: channel.avatar,
      isLive: channel.isLive,
    }));

    res.json({
      success: true,
      channels,
    });
  } catch (error) {
    console.error("Get following channels error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách kênh",
    });
  }
};
