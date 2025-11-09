import express from 'express';
import { listContacts, editContact, deleteContact, createContact } from '../Controllers/contactController.js';

const router = express.Router();

router.get('/', listContacts);
router.post('/', createContact);
router.put('/:id', editContact);
router.delete('/:id', deleteContact);

export default router;
