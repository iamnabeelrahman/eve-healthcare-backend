import bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { SignupInput, LoginInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

function toPublic(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const authService = {
  async signup(input: SignupInput): Promise<PublicUser> {
    const existing = await userRepository.findByEmail(input.email.toLowerCase());
    if (existing) {
      throw AppError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    });
    return toPublic(user);
  },

  async login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
    const user = await userRepository.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return { token, user: toPublic(user) };
  },

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    return toPublic(user);
  },
};