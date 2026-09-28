import { User } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },
  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },
  create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({ data });
  },
};