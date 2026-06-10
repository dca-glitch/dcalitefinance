import { Router } from 'express';
import { live, ready } from '../controllers/health.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const healthRoutes = Router();

healthRoutes.get('/live', live);
healthRoutes.get('/ready', asyncHandler(ready));
