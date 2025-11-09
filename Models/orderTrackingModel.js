import mongoose from 'mongoose';

const orderTrackingSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'placed'
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  deliveryAddress: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  restaurantLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [77.2090, 28.6139] // Default to Delhi coordinates
    },
    address: {
      type: String,
      default: 'FoodieFi Restaurant, Delhi'
    }
  },
  estimatedDeliveryTime: {
    type: Date,
    required: true
  },
  actualDeliveryTime: {
    type: Date,
    default: null
  },
  trackingHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    message: {
      type: String,
      default: ''
    }
  }],
  riderInfo: {
    name: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'bicycle', 'scooter'],
      default: 'bike'
    },
    vehicleNumber: {
      type: String,
      default: ''
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location queries
orderTrackingSchema.index({ currentLocation: '2dsphere' });
orderTrackingSchema.index({ deliveryAddress: '2dsphere' });
orderTrackingSchema.index({ restaurantLocation: '2dsphere' });

// Virtual for estimated time remaining
orderTrackingSchema.virtual('estimatedTimeRemaining').get(function() {
  if (this.status === 'delivered') return 0;
  const now = new Date();
  const estimatedTime = new Date(this.estimatedDeliveryTime);
  return Math.max(0, estimatedTime - now);
});

// Virtual for delivery progress percentage
orderTrackingSchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    'placed': 10,
    'confirmed': 25,
    'preparing': 40,
    'ready_for_pickup': 55,
    'out_for_delivery': 75,
    'delivered': 100,
    'cancelled': 0
  };
  return statusProgress[this.status] || 0;
});

// Method to update tracking status
orderTrackingSchema.methods.updateStatus = function(newStatus, location = null, message = '') {
  this.status = newStatus;
  
  if (location && location.coordinates && location.coordinates.length === 2) {
    this.currentLocation = location;
  }
  
  // Add to tracking history
  this.trackingHistory.push({
    status: newStatus,
    timestamp: new Date(),
    location: location || this.currentLocation,
    message: message
  });
  
  // Update actual delivery time if delivered
  if (newStatus === 'delivered') {
    this.actualDeliveryTime = new Date();
  }
  
  return this.save();
};

// Method to assign rider
orderTrackingSchema.methods.assignRider = function(riderData) {
  this.riderId = riderData.riderId;
  this.riderInfo = {
    name: riderData.name || 'Delivery Partner',
    phone: riderData.phone || '',
    avatar: riderData.avatar || '',
    vehicleType: riderData.vehicleType || 'bike',
    vehicleNumber: riderData.vehicleNumber || ''
  };
  return this.save();
};

// Static method to get nearby orders for riders
orderTrackingSchema.statics.findNearbyOrders = function(coordinates, maxDistance = 5000) {
  return this.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: { $in: ['ready_for_pickup', 'out_for_delivery'] },
    isActive: true
  }).populate('orderId customerId riderId');
};

const OrderTracking = mongoose.model('OrderTracking', orderTrackingSchema);

export default OrderTracking;