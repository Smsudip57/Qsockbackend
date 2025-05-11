const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountAmount: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        if (this.discountType === 'percentage') {
          return value >= 1 && value <= 100;
        }
        return value > 0;
      },
      message: props => 
        props.value < 0 ? 'Discount cannot be negative' :
        props.value > 100 && props.type === 'percentage' ? 'Percentage discount cannot exceed 100%' :
        'Invalid discount amount'
    }
  },
  maxUsage: {
    type: Number,
    required: true,
    min: 1
  },
  usageCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'expired'],
    default: 'active'
  },
  allowedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plans'
  }],
  minimumPurchase: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


couponSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  if (this.expiresAt < new Date() && this.status !== 'expired') {
    this.status = 'expired';
  }
  next();
});

// Create a virtual property to determine if the coupon is valid
couponSchema.virtual('isValid').get(function() {
  return this.status === 'active' && 
         this.expiresAt > new Date() && 
         this.usageCount < this.maxUsage;
});

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

module.exports = Coupon;