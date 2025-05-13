const mongoose = require("mongoose");

const proxySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan: {
    type: Object,
    required: true,
  },
  order_id: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function (value) {
        return typeof value === "string" || typeof value === "number";
      },
      message: (props) =>
        `${props.value} is not a valid order ID! Must be string or number.`,
    },
  },
  type: {
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
  proxy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const Proxyhistory =
  mongoose.models.Proxyhistory || mongoose.model("Proxyhistory", proxySchema);

module.exports = Proxyhistory;
