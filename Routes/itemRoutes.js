import express from 'express';
import multer from 'multer';
import { 
  createItem, 
  getItems, 
  deleteItem, 
  getItemCount, 
  getSpecialOffers, 
  updateItem, 
  getItemById, 
  updateStock, 
  getOutOfStockItems,
  getItemStock,
  checkBulkStock,
  updateStockAfterOrder
} from '../Controllers/itemController.js';

const itemRouter = express.Router();

// Multer storage configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

itemRouter.post('/create', upload.single('image'), createItem);
itemRouter.get('/list', getItems);
itemRouter.get('/count', getItemCount);
itemRouter.get('/special-offers', getSpecialOffers);
itemRouter.get('/out-of-stock', getOutOfStockItems);

// Stock management routes
itemRouter.get('/stock/:id', getItemStock);
itemRouter.post('/stock/check-bulk', checkBulkStock);
itemRouter.post('/stock/update-after-order', updateStockAfterOrder);

itemRouter.get('/:id', getItemById);
itemRouter.put('/update/:id', upload.single('image'), updateItem);
itemRouter.patch('/stock/:id', updateStock);
itemRouter.delete('/delete/:id', deleteItem);

export default itemRouter;
