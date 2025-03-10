const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
};

module.exports = {
  verifyToken,
  generateToken
}; 