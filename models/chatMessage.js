const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    ref: "ChatSession",
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // null for guest messages
  },
  senderType: {
    type: String,
    enum: ["user", "admin", "guest"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  senderName: {
    type: String, // For admin identification to other admins
    default: "Support",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
