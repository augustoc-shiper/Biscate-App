import { Router } from 'express';
import * as professionalsController from '../controllers/professionals.controller.js';

export const professionalRoutes = Router();
export const metaRoutes = Router();

professionalRoutes.get('/', professionalsController.list);
professionalRoutes.get('/:id', professionalsController.detail);

metaRoutes.get('/categories', professionalsController.categories);
metaRoutes.get('/bairro', professionalsController.bairros);
