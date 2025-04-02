const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  productId: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
    enum: [
      "Static Residential Proxies",
      "Budget Residential Proxies",
      "Datacenter Proxies",
      "Datacenter IPv6 Proxies",
      "Premium Residential Proxies",
      "LTE Mobile Proxies",
    ],
  },
  plans: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      amount: {
        type: Number,
      },
      id: {
        type: String,
      },
      name: {
        type: String,
        required: true,
      },
      tag: {
        type: String,
        required: true,
      },
      note: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Plan = mongoose.models.Plans || mongoose.model("Plans", planSchema);

module.exports = Plan;
