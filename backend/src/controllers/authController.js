import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";

const ACCESS_TOKEN_TTL = "3d";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày

// @desc    signUp user
// @route   POST /api/auth/signUp
// @access  Public
export const signUp = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Kiểm tra đầu vào
    if (!username || !email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ các trường bắt buộc!",
      });
    }

    // Kiểm tra username tồn tại chưa
    const userExists = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Người dùng đã tồn tại!",
      });
    }

    // Mã hóa Password
    const hashedPassword = await bcrypt.hash(password, 10); // salt = 10

    // Tạo user mới
    const streamKey = `sk_${crypto.randomBytes(16).toString("hex")}`;
    await User.create({
      username,
      email,
      hashedPassword,
      displayName,
      streamKey,
    });

    // return
    return res.sendStatus(204);
  } catch (error) {
    console.error("Sign up error:", error);
    res.status(500).json({
      success: false,
      message: ["Lỗi hệ thống!", error.message],
    });
  }
};

// @desc    Sign In user
// @route   POST /api/auth/signin
// @access  Public
export const signIn = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Kiểm tra đầu vào
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đúng email and password!",
      });
    }

    // Kiểm tra user đã tồn tại chưa
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Thông tin đăng nhập không hợp lệ!",
      });
    }

    // Kiểm tra password so với hash password
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Thông tin đăng nhập không hợp lệ!",
      });
    }

    // Tạo token
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_TTL,
      }
    );

    // Tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Tạo session mới để lưu refresh token
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // Trả refresh token về trong cookie
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd, // prod: true, dev: false (để chrome lưu cookie ở http)
      sameSite: isProd ? "none" : "lax", // prod: 'none', dev: 'lax'
      maxAge: REFRESH_TOKEN_TTL,
    });

    res.status(200).json({
      success: true,
      message: `User ${user.displayName} đã logged in!`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        streamKey: user.streamKey,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Sign in error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống!",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/signout
// @access  Private
export const signOut = async (req, res) => {
  try {
    // Lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;

    if (token) {
      // Xóa refresh token trong Session
      await Session.deleteOne({ refreshToken: token });

      // Xóa cookie
      const isProd = process.env.NODE_ENV === "production";
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
      });
    }

    return res.status(204).json({
      success: true,
      message: "Đăng xuất thành công!",
    });
  } catch (error) {
    console.error("Sign out error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống!",
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const authMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        streamKey: user.streamKey,
        isLive: user.isLive,
      },
    });
  } catch (error) {
    console.error("AuthMe error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
};

// @desc    Create new access token from refresh token
// @route   GET /api/auth/refresh
// @access  Private
export const refreshToken = async (req, res) => {
  try {
    // Lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Token không tồn tại!" });
    }

    // So với refresh token trong db
    const session = await Session.findOne({ refreshToken: token });
    if (!session) {
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
    }

    // Kiểm tra hết hạn chưa
    if (session.expiresAt < new Date()) {
      return res.status(403).json({ message: "Token đã hết hạn!" });
    }

    // Tạo access token mới
    const accessToken = jwt.sign(
      {
        userId: session.userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // Return
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Lỗi khi gọi refreshToken", error);
    return res.status(500).json({ message: "Lỗi hệ thống!" });
  }
};
