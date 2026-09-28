import { DiagnosticTest } from '@prisma/client';
import { testRepository } from '../repositories/test.repository';
import { cacheService, CacheKeys } from './cache.service';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { PaginatedResult } from '../types';
import { CreateTestInput, UpdateTestInput } from '../schemas/test.schema';

const TTL = 60;

export const testService = {
  async list(page: number, limit: number): Promise<PaginatedResult<DiagnosticTest>> {
    const key = CacheKeys.testsList(page, limit);
    const cached = await cacheService.get<PaginatedResult<DiagnosticTest>>(key);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [data, total] = await testRepository.findMany(skip, limit);
    const result: PaginatedResult<DiagnosticTest> = {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    };
    await cacheService.set(key, result, TTL);
    return result;
  },

  async getById(id: string): Promise<DiagnosticTest> {
    const key = CacheKeys.test(id);
    const cached = await cacheService.get<DiagnosticTest>(key);
    if (cached) return cached;

    const test = await testRepository.findById(id);
    if (!test) throw AppError.notFound('TEST_NOT_FOUND', 'Diagnostic test not found');
    await cacheService.set(key, test, TTL);
    return test;
  },

  async create(input: CreateTestInput): Promise<DiagnosticTest> {
    const test = await testRepository.create(input);
    await cacheService.invalidatePattern(CacheKeys.testsListPattern());
    return test;
  },

  async update(id: string, input: UpdateTestInput): Promise<DiagnosticTest> {
    await this.getById(id);
    const test = await testRepository.update(id, input);
    await cacheService.invalidate([CacheKeys.test(id)]);
    await cacheService.invalidatePattern(CacheKeys.testsListPattern());
    return test;
  },

  async remove(id: string): Promise<void> {
    await this.getById(id);
    await testRepository.delete(id);
    await cacheService.invalidate([CacheKeys.test(id)]);
    await cacheService.invalidatePattern(CacheKeys.testsListPattern());
  },
};