import express from 'express';
import { listUsers, editUser, deleteUser, getUserCount } from '../Controllers/userManagementController.js';

const router = express.Router();

router.get('/', listUsers);
router.get('/count', getUserCount);
router.put('/:id', editUser);
router.delete('/:id', deleteUser);

export default router;
