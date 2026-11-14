import type { NextFunction, Request, Response } from 'express';
import { CreateReviewDto } from '../dto/reviews.dto.js';
import { ok } from '../lib/respond.js';
import * as reviewsService from '../services/reviews.service.js';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = CreateReviewDto.parse(req.body);
    const created = await reviewsService.createReview(req.user!.id, input);
    ok(res, created, 201);
  } catch (err) {
    next(err);
  }
}
