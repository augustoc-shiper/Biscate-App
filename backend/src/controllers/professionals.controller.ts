import type { NextFunction, Request, Response } from 'express';
import { ProfessionalQueryDto } from '../dto/professionals.dto.js';
import { ok } from '../lib/respond.js';
import * as professionalsService from '../services/professionals.service.js';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ProfessionalQueryDto.parse(req.query);
    const result = await professionalsService.listProfessionals(query);
    res.status(200).json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

export async function detail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await professionalsService.getProfessional(
      String(req.params.id),
    );
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function categories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, await professionalsService.listCategories());
  } catch (err) {
    next(err);
  }
}

export async function bairros(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, await professionalsService.listBairro());
  } catch (err) {
    next(err);
  }
}
