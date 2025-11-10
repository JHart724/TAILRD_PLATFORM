import { Router } from 'express';
import { APIResponse } from '../types';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Patients endpoint - implementation pending',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

export = router;