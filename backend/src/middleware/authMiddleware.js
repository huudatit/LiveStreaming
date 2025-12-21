import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy access token",
      });
    }
    // Xác nhận token hợp lệ
    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decodedUser) => {
        if (err) {
          console.error(err);
          return res.status(403).json({message: "Access token hết hạn hoặc không đúng!"})
        }

        // Tìm user
        const user = await User.findById(decodedUser.userId).select('-hashedPassword');

        if (!user) {
          return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        // Trả về user trong req
        req.user = user;
        next();
      }
    );
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};
