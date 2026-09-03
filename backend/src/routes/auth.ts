import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../lib/bcrypt';
import { signToken } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/signup
const signup: RequestHandler = async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'An account with this email already exists.');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: 'STUDENT' },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login: RequestHandler = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const passwordValid = await comparePassword(data.password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me (protected)
const me: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated.');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticate, me as RequestHandler);

export default router;
