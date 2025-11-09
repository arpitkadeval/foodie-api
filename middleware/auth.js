import jwt from 'jsonwebtoken';
import userModel from '../Models/enhancedUserModel.js';

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  console.log('Auth Middleware - Token:', token);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token Missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Middleware - Decoded Token:', decoded);
    // Normalize user object to include both _id and userId for downstream controllers
    req.user = { _id: decoded.userId, userId: decoded.userId, email: decoded.email };

    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Temporarily disabled for testing
    // if (!user.isEmailVerified) {
    //   return res.status(403).json({ success: false, message: 'Email not verified. Access denied.' });
    // }

    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid Token';
    res.status(403).json({ success: false, message });
  }
};

export default authMiddleware;
