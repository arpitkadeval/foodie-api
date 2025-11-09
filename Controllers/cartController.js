import Cart from '../Models/cartModel.js';
import Item from '../Models/itemModel.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }
    console.log('Cart data sent:', cart);
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get cart', error });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId, quantity } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(i => i.itemId.toString() === itemId);
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      console.log('Saving imageUrl in cart item:', item.imageUrl);
      cart.items.push({
        itemId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity,
      });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    console.error('Error in addToCart:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Failed to add to cart', error });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(i => i.itemId.toString() !== itemId);
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove from cart', error });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.find(i => i.itemId.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    item.quantity = quantity;
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update quantity', error });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart', error });
  }
};

export const incrementQuantity = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      console.error('incrementQuantity: No user ID found in request');
      return res.status(401).json({ message: 'Unauthorized: No user ID' });
    }
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.find(i => i.itemId.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    item.quantity += 1;
    await cart.save();
    res.json(cart);
  } catch (error) {
    console.error('Error in incrementQuantity:', error);
    res.status(500).json({ message: 'Failed to increment quantity', error });
  }
};

export const decrementQuantity = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      console.error('decrementQuantity: No user ID found in request');
      return res.status(401).json({ message: 'Unauthorized: No user ID' });
    }
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.find(i => i.itemId.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (item.quantity > 1) {
      item.quantity -= 1;
      await cart.save();
    } else {
      // Remove item from cart when quantity reaches 0
      cart.items = cart.items.filter(i => i.itemId.toString() !== itemId);
      await cart.save();
    }
    res.json(cart);
  } catch (error) {
    console.error('Error in decrementQuantity:', error);
    res.status(500).json({ message: 'Failed to decrement quantity', error });
  }
};
