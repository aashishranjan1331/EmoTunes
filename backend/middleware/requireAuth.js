import jwt from 'jsonwebtoken';

export default function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    console.log('JWT payload:', payload); // temporary, remove later

    const id = payload.sub || payload.id || payload._id || payload.userId;
    if (!id) {
      return res.status(401).json({ message: 'Token has no user id. Please log in again.' });
    }

    req.user = { ...payload, _id: id };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
}