import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireJson } from '../middleware/requireJson.js';
import { list, create, remove } from '../controllers/submissionController.js';

const router = Router();

router.get('/', authenticate, list);
router.post('/', authenticate, requireJson, express.json({ limit: '100kb' }), create);
router.delete('/:id', authenticate, remove);

export default router;
