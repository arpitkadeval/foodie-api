import Banner from '../Models/bannerModel.js';
import fs from 'fs';
import path from 'path';

// Upload banner image
const createBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file uploaded' 
      });
    }

    const banner = new Banner({
      imageUrl: `/uploads/banners/${req.file.filename}`,
    });

    await banner.save();
    
    res.status(201).json({ 
      success: true, 
      data: banner,
      message: 'Banner uploaded successfully'
    });

  } catch (error) {
    console.error('Error creating banner:', error);
    
    // Delete the uploaded file if DB operation failed
    if (req.file) {
      const filePath = path.join('uploads/banners', req.file.filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }

    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload banner'
    });
  }
};

// Get all banners
const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      count: banners.length,
      data: banners,
      message: banners.length ? 'Banners retrieved successfully' : 'No banners found'
    });

  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch banners' 
    });
  }
};

// Delete a banner
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Banner not found' 
      });
    }

    // Delete the associated image file
    const filename = banner.imageUrl.split('/').pop();
    const filePath = path.join('uploads/banners', filename);
    
    fs.unlink(filePath, async (err) => {
      if (err && err.code !== 'ENOENT') { // Ignore if file doesn't exist
        console.error('Error deleting image file:', err);
      }

      // Delete from database
      await Banner.findByIdAndDelete(req.params.id);
      
      res.status(200).json({ 
        success: true, 
        message: 'Banner deleted successfully' 
      });
    });

  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete banner' 
    });
  }
};

export { 
  createBanner, 
  getAllBanners, 
  deleteBanner 
};