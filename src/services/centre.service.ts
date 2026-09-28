import { DiagnosticCentre } from '@prisma/client';
import { centreRepository } from '../repositories/centre.repository';
import { testRepository } from '../repositories/test.repository';
import { centreTestRepository } from '../repositories/centreTest.repository';
import { cacheService, CacheKeys } from './cache.service';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { PaginatedResult } from '../types';
import { CreateCentreInput, UpdateCentreInput } from '../schemas/centre.schema';

const TTL = 60;

export const centreService = {
  async list(page: number, limit: number): Promise<PaginatedResult<DiagnosticCentre>> {
    const key = CacheKeys.centresList(page, limit);
    const cached = await cacheService.get<PaginatedResult<DiagnosticCentre>>(key);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [data, total] = await centreRepository.findMany(skip, limit);
    const result: PaginatedResult<DiagnosticCentre> = {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    };
    await cacheService.set(key, result, TTL);
    return result;
  },

  async getById(id: string): Promise<DiagnosticCentre> {
    const key = CacheKeys.centre(id);
    const cached = await cacheService.get<DiagnosticCentre>(key);
    if (cached) return cached;

    const centre = await centreRepository.findById(id);
    if (!centre) throw AppError.notFound('CENTRE_NOT_FOUND', 'Diagnostic centre not found');
    await cacheService.set(key, centre, TTL);
    return centre;
  },

  async create(input: CreateCentreInput): Promise<DiagnosticCentre> {
    const centre = await centreRepository.create(input);
    await cacheService.invalidatePattern(CacheKeys.centresListPattern());
    return centre;
  },

  async update(id: string, input: UpdateCentreInput): Promise<DiagnosticCentre> {
    await this.getById(id); // ensures 404 before update
    const centre = await centreRepository.update(id, input);
    await cacheService.invalidate([CacheKeys.centre(id)]);
    await cacheService.invalidatePattern(CacheKeys.centresListPattern());
    return centre;
  },

  async remove(id: string): Promise<void> {
    await this.getById(id);
    await centreRepository.delete(id);
    await cacheService.invalidate([CacheKeys.centre(id), CacheKeys.centreTests(id)]);
    await cacheService.invalidatePattern(CacheKeys.centresListPattern());
  },

  async listTestsForCentre(centreId: string) {
    const key = CacheKeys.centreTests(centreId);
    const cached = await cacheService.get<unknown[]>(key);
    if (cached) return cached;

    // Ensure the centre exists — avoids caching empty results for bogus IDs.
    await this.getById(centreId);
    const centreTests = await centreTestRepository.findByCentreId(centreId);
    const data = centreTests.map((ct) => ({
      id: ct.id,
      centreId: ct.centreId,
      testId: ct.testId,
      price: ct.price,
      test: ct.test,
    }));
    await cacheService.set(key, data, TTL);
    return data;
  },

  async associateTest(centreId: string, testId: string, price: number) {
    // Validate existence of both sides.
    await this.getById(centreId);
    const test = await testRepository.findById(testId);
    if (!test) throw AppError.notFound('TEST_NOT_FOUND', 'Diagnostic test not found');

    const existing = await centreTestRepository.findByCentreAndTest(centreId, testId);
    if (existing) {
      throw AppError.conflict(
        'CENTRE_TEST_EXISTS',
        'This test is already associated with the centre',
      );
    }

    const created = await centreTestRepository.create({ centreId, testId, price });
    await cacheService.invalidate([CacheKeys.centreTests(centreId)]);
    return created;
  },

  async updateCentreTestPrice(centreId: string, testId: string, price: number) {
    await this.getById(centreId);
    const existing = await centreTestRepository.findByCentreAndTest(centreId, testId);
    if (!existing) {
      throw AppError.notFound('CENTRE_TEST_NOT_FOUND', 'Centre/test association not found');
    }
    const updated = await centreTestRepository.updatePrice(centreId, testId, price);
    await cacheService.invalidate([CacheKeys.centreTests(centreId)]);
    return updated;
  },

  async removeCentreTest(centreId: string, testId: string): Promise<void> {
    await this.getById(centreId);
    const existing = await centreTestRepository.findByCentreAndTest(centreId, testId);
    if (!existing) {
      throw AppError.notFound('CENTRE_TEST_NOT_FOUND', 'Centre/test association not found');
    }
    await centreTestRepository.delete(centreId, testId);
    await cacheService.invalidate([CacheKeys.centreTests(centreId)]);
  },
};