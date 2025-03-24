const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  password: {
    type: String,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  balance: {
    type: Number,
    default: 0
  },
  profile: {
    name: {
      type: String,
      trim: true
    },
    avatarUrl: {
      type: String,
      default: 'https://default-avatar-url.com'
    },
  },
  varificationcode: {
    code:{
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  // payment:{
  //   status: {
  //     type: String,
  //     enum: ['paid', 'unpaid'],
  //     default: 'unpaid'
  //   },
  //   transactionId: {
  //     type: String,
  //   }
  // },
 isActive: {
   type: Boolean,
   default: false
 },
 ResidentialCredentials:{
  id:{
    type: Number
  },
  username:{
    type: String
  },
  password:{
    type: String
  },
  availableTraffic:{
    type: Number
  },
  usedTraffic:{
    type: Number
  }
},
 BudgetResidentialCredentials:{
  id:{
    type: Number
  },
  username:{
    type: String
  },
  password:{
    type: String
  },
  availableTraffic:{
    type: Number
  },
  usedTraffic:{
    type: Number
  }
 },
})



const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
