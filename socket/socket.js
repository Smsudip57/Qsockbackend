const socketio = require("socket.io");
const ChatSession = require("../models/chatSession");
const ChatMessage = require("../models/chatMessage");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const setupSocket = (server) => {
  const io = socketio(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://qsocks.net",
        "https://www.qsocks.net",
        process.env.Client_Url,
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Store admin sockets for broadcasting
  const adminSockets = new Map();
  const userSockets = new Map();

  // Helper function to extract user from cookies
  const getUserFromCookies = async (cookies) => {

    if (!cookies) {
      return null;
    }

    try {
      let accessToken = null;
      let refreshToken = null;

      // Parse cookies if they're in string format
      if (typeof cookies === "string") {
        const cookiePairs = cookies.split(";");
        for (const cookie of cookiePairs) {
          const [name, value] = cookie.trim().split("=");
          if (name === "access") accessToken = value;
          if (name === "refresh") refreshToken = value;
        }
      } else {
        accessToken = cookies.access;
        refreshToken = cookies.refresh;
      }

    

      if (!accessToken && !refreshToken) {
        return null;
      }

      let userId = null;

      // Try access token first
      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
          userId = decoded.userId;
        } catch (error) {
        }
      }

      // Fall back to refresh token
      if (!userId && refreshToken) {
        try {
          const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
          userId = decoded.userId;
        } catch (error) {
        }
      }

      if (userId) {
        const user = await User.findById(userId);
      
        return user;
      }
    } catch (error) {
    }

    return null;
  };

  io.on("connection", (socket) => {

    // Create new chat session
    socket.on("createChatSession", async ({ email, issue, userType }) => {
      try {
        let userId = null;
        let userName = email;

        // Try to get user from cookies if userType is 'user'
        if (userType === "user") {
          const user = await getUserFromCookies(
            socket.handshake.headers.cookie
          );
          if (user) {
            userId = user._id;
            userName = user.name || user.email;
            email = user.email;
          }
        }

        // Generate unique session ID and guest token
        const sessionId = uuidv4();
        const guestToken = uuidv4();

        // Create new chat session
        const newSession = new ChatSession({
          sessionId: sessionId,
          email,
          issue,
          userId: userId || null,
          userType: userId ? "user" : "guest",
          guestToken,
          status: "active",
          createdAt: new Date(),
          lastActivity: new Date(),
        });

        await newSession.save();

        // Store socket mapping
        userSockets.set(socket.id, {
          sessionId: sessionId,
          guestToken,
          userType: userId ? "user" : "guest",
          userId,
        });

        // Send session created event
        socket.emit("chatSessionCreated", {
          sessionId: sessionId,
          guestToken,
        });

        // Notify all admins about new session
        for (const adminSocket of adminSockets.values()) {
          adminSocket.emit("userConnected", {
            sessionId: sessionId,
            session: {
              email: newSession.email,
              issue: newSession.issue,
              userType: newSession.userType,
              createdAt: newSession.createdAt,
              lastActivity: newSession.lastActivity,
            },
          });
        }

      } catch (error) {
        console.error("Error creating chat session:", error);
        socket.emit("error", { message: "Failed to create chat session" });
      }
    });

    // Join chat session
    socket.on("joinChatSession", async ({ sessionId, guestToken }) => {
      try {
        let userId = null;
        let userType = "guest";
        let userName = "Guest";

        // Try to get user from cookies
        const user = await getUserFromCookies(socket.handshake.headers.cookie);
        if (user) {
          userId = user._id;
          userType = user.role;
          userName = user.profile?.name || user.email;
        }

        // Verify session access
        const session = await ChatSession.findOne({ sessionId });
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Check access permissions
        let hasAccess = false;
        if (userType === "admin") {
          hasAccess = true;
          adminSockets.set(socket.id, { userId, sessionId, userName });
        } else if (session.userId && session.userId.toString() === userId) {
          hasAccess = true;
        } else if (session.guestToken === guestToken) {
          hasAccess = true;
        }

        if (!hasAccess) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Join the session room
        socket.join(sessionId);
        userSockets.set(socket.id, { userId, sessionId, userType, userName });

        
        // Update last activity
        await ChatSession.findOneAndUpdate(
          { sessionId },
          { lastActivity: new Date() }
        );

        socket.emit("joinedChatSession", {
          sessionId,
          userType,
          userName: userType === "admin" ? userName : "You",
        });

        // Notify admins about new user connection (except admin connections)
        if (userType !== "admin") {
          socket.to("admin-room").emit("userConnected", {
            sessionId,
            userType,
            session: {
              email: session.email,
              issue: session.issue,
              createdAt: session.createdAt,
            },
          });
        }
      } catch (error) {
        console.error("Error joining chat session:", error);
        socket.emit("error", { message: "Failed to join session" });
      }
    });

    // Admin joins admin room
    socket.on("joinAdminRoom", async () => {
      try {
        const user = await getUserFromCookies(socket.handshake.headers.cookie);

      

        if (user && user.role === "admin") {
          socket.join("admin-room");
          adminSockets.set(socket.id, {
            userId: user._id,
            userName: user.profile?.name || user.email,
          });
          socket.emit("joinedAdminRoom", {
            userName: user.profile?.name || user.email,
          });
        } else {
          socket.emit("error", { message: "Admin access denied" });
        }
      } catch (error) {
        console.error("Error in joinAdminRoom:", error);
        socket.emit("error", { message: "Admin access denied" });
      }
    });

    // Send message
    socket.on("sendMessage", async ({ sessionId, message, guestToken }) => {
      try {

        let userId = null;
        let senderType = "guest";
        let senderName = "Guest";

        // Try to get user from cookies
        const user = await getUserFromCookies(socket.handshake.headers.cookie);
        if (user) {
          userId = user._id;
          senderType = user.role;
          senderName = user.profile?.name || user.email;
        }


        // Verify session access
        const session = await ChatSession.findOne({ sessionId });
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Check permissions
        let hasAccess = false;
        if (senderType === "admin") {
          hasAccess = true;
        } else if (session.userId && session.userId.toString() === userId) {
          hasAccess = true;
        } else if (session.guestToken === guestToken) {
          hasAccess = true;
        }

   

        if (!hasAccess) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Create message
        const chatMessage = new ChatMessage({
          sessionId,
          senderId: userId,
          senderType,
          message,
          senderName: senderName,
        });

        await chatMessage.save();

        // Update session activity
        await ChatSession.findOneAndUpdate(
          { sessionId },
          { lastActivity: new Date() }
        );

        // Prepare message for different audiences
        const messageForCustomers = {
          _id: chatMessage._id,
          sessionId,
          senderType,
          message,
          timestamp: chatMessage.timestamp,
          senderName: senderType === "admin" ? "Support" : senderName,
        };

        const messageForAdmins = {
          _id: chatMessage._id,
          sessionId,
          senderType,
          message,
          timestamp: chatMessage.timestamp,
          senderName,
          session: {
            email: session.email,
            issue: session.issue,
          },
        };

        // Send to everyone in the session room
        // Customers will see 'Support', admins will see real names
        const socketsInRoom = io.sockets.adapter.rooms.get(sessionId);
    

        if (socketsInRoom) {
          for (const socketId of socketsInRoom) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              // Check if this socket is an admin
              const socketInfo =
                adminSockets.get(socketId) || userSockets.get(socketId);

              if (
                socketInfo &&
                (socketInfo.userType === "admin" || adminSockets.has(socketId))
              ) {
                // Send admin version to admin sockets
                socket.emit("receiveMessage", messageForAdmins);
              } else {
                // Send customer version to user/guest sockets
                socket.emit("receiveMessage", messageForCustomers);
              }
            }
          }
        }

      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Mark message as read by admin
    socket.on("adminReadsMessage", async ({ sessionId, messageId }) => {
      try {
        const message = await ChatMessage.findByIdAndUpdate(
          messageId,
          { isReadByAdmin: true },
          { new: true }
        );

        if (message) {
          io.to(sessionId).emit("adminReadMessage", { messageId });
        }
      } catch (error) {
        console.error("Error marking message as read by admin:", error);
      }
    });

    // Mark message as read by user
    socket.on("userReadsMessage", async ({ sessionId, messageId }) => {
      try {
        const message = await ChatMessage.findByIdAndUpdate(
          messageId,
          { isReadByUser: true },
          { new: true }
        );

        if (message) {
          io.to("admin-room").emit("userReadMessage", { sessionId, messageId });
        }
      } catch (error) {
        console.error("Error marking message as read by user:", error);
      }
    });

    // Get active sessions for admin
    socket.on("getActiveSessions", async () => {
      try {
        const user = await getUserFromCookies(socket.handshake.headers.cookie);


        if (user && user.role === "admin") {
          const activeSessions = await ChatSession.find({
            status: "active",
          }).sort({ lastActivity: -1 });

          socket.emit("activeSessions", { sessions: activeSessions });
        } else {
          socket.emit("error", { message: "Admin access denied" });
        }
      } catch (error) {
        console.error("Error getting active sessions:", error);
        socket.emit("error", { message: "Failed to get active sessions" });
      }
    });

    // Get chat history for session
    socket.on("getChatHistory", async ({ sessionId, guestToken }) => {
      try {
       

        let userId = null;
        let userType = "guest";

        // Try to get user from cookies
        const user = await getUserFromCookies(socket.handshake.headers.cookie);
        if (user) {
          userId = user._id;
          userType = user.role;
       
        }

        // Verify session access
        const session = await ChatSession.findOne({ sessionId });
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        

        // Check permissions
        let hasAccess = false;
        if (userType === "admin") {
          hasAccess = true;
        } else if (session.userId && session.userId.toString() === userId) {
          hasAccess = true;
        } else if (session.guestToken === guestToken) {
          hasAccess = true;
        }

      

        if (!hasAccess) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Get messages
        const messages = await ChatMessage.find({ sessionId }).sort({
          timestamp: 1,
        });


        // Format messages based on user type
        const formattedMessages = messages.map((msg) => ({
          _id: msg._id,
          sessionId: msg.sessionId,
          senderType: msg.senderType,
          message: msg.message,
          timestamp: msg.timestamp,
          senderName:
            userType === "admin"
              ? msg.senderName
              : msg.senderType === "admin"
              ? "Support"
              : msg.senderName,
          isReadByAdmin: msg.isReadByAdmin,
          isReadByUser: msg.isReadByUser,
        }));

        socket.emit("chatHistory", {
          sessionId,
          messages: formattedMessages,
          session: {
            email: session.email,
            issue: session.issue,
            status: session.status,
            createdAt: session.createdAt,
          },
        });

      } catch (error) {
        console.error("Error getting chat history:", error);
        socket.emit("error", { message: "Failed to get chat history" });
      }
    });

    // Close chat session
    socket.on("closeChatSession", async ({ sessionId }) => {
      try {
        const user = await getUserFromCookies(socket.handshake.headers.cookie);

        if (user && user.role === "admin") {
          await ChatSession.findOneAndUpdate(
            { sessionId },
            {
              status: "closed",
              closedAt: new Date(),
            }
          );

          io.to(sessionId).emit("sessionClosed", {
            message: "Chat session has been closed by support.",
          });

          io.to("admin-room").emit("sessionClosed", { sessionId });
        }
      } catch (error) {
        console.error("Error closing session:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {

      // Clean up socket references
      if (adminSockets.has(socket.id)) {
        adminSockets.delete(socket.id);
      }
      if (userSockets.has(socket.id)) {
        userSockets.delete(socket.id);
      }
    });
  });

  return io;
};

module.exports = setupSocket;
