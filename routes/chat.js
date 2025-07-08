const express = require("express");
const router = express.Router();
const ChatSession = require("../models/chatSession");
const ChatMessage = require("../models/chatMessage");
const User = require("../models/user");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

// Helper function to get user from cookies
const getUserFromRequest = async (req) => {
  try {
    const accessToken = req.cookies.access;
    const refreshToken = req.cookies.refresh;

    if (!accessToken && !refreshToken) return null;

    let userId = null;

    // Try access token first
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        // Access token invalid
      }
    }

    // Fall back to refresh token
    if (!userId && refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        // Refresh token invalid
      }
    }

    if (userId) {
      const user = await User.findById(userId);
      return user;
    }
  } catch (error) {
    // Error extracting user from cookies
  }

  return null;
};

// Create a new chat session
router.post("/create-session", async (req, res) => {
  try {
    const { email, issue } = req.body;

    if (!email || !issue) {
      return res.status(400).json({ error: "Email and issue are required" });
    }

    // Generate unique session ID and guest token
    const sessionId = uuidv4();
    const guestToken = uuidv4();

    // Check if user is logged in (from cookies)
    const user = await getUserFromRequest(req);
    const userId = user ? user._id : null;

    const chatSession = new ChatSession({
      sessionId,
      email,
      issue,
      userId,
      guestToken: userId ? null : guestToken, // Only set guest token if no user
    });

    await chatSession.save();

    res.status(201).json({
      success: true,
      sessionId,
      guestToken: userId ? null : guestToken,
      isGuest: !userId,
    });
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

// Get chat history for a session
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { guestToken } = req.query;

    // Verify access to session
    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check if user has access to this session
    let hasAccess = false;

    // Check if user is logged in and owns the session
    const user = await getUserFromRequest(req);
    if (
      user &&
      session.userId &&
      session.userId.toString() === user._id.toString()
    ) {
      hasAccess = true;
    }

    // Check guest token
    if (!hasAccess && session.guestToken === guestToken) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await ChatMessage.find({ sessionId })
      .sort({ timestamp: 1 })
      .select("-senderName"); // Hide admin names from customers

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        email: session.email,
        issue: session.issue,
        status: session.status,
        createdAt: session.createdAt,
      },
      messages,
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// Link guest session to logged-in user
router.post("/link-session", async (req, res) => {
  try {
    const { sessionId, guestToken } = req.body;

    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Find the guest session
    const session = await ChatSession.findOne({
      sessionId,
      guestToken,
      userId: null, // Only link sessions that aren't already linked
    });

    if (!session) {
      return res
        .status(404)
        .json({ error: "Session not found or already linked" });
    }

    // Link the session to the user
    session.userId = user._id;
    session.guestToken = null; // Remove guest token
    await session.save();

    res.json({
      success: true,
      message: "Session linked successfully",
    });
  } catch (error) {
    console.error("Error linking session:", error);
    res.status(500).json({ error: "Failed to link session" });
  }
});

// Admin routes
router.get("/admin/sessions", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const sessions = await ChatSession.find({ status: { $ne: "closed" } })
      .populate("userId", "email profile.name")
      .populate("assignedAdmin", "profile.name email")
      .sort({ lastActivity: -1 });

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Error fetching admin sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.get("/admin/session/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const user = await getUserFromRequest(req);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const messages = await ChatMessage.find({ sessionId })
      .populate("senderId", "profile.name email")
      .sort({ timestamp: 1 });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Error fetching admin messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
