const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const dbConnect = require("./dbConnect/dbConnect"); // Import the database connection
const auth = require("./routes/auth");
// const chat = require('./routes/chatSession');
const payment = require("./routes/payment");
const user = require("./routes/user");
const admin = require("./routes/admin");
const { adminAuth, userAuth } = require("./middlewares/Auth");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

const http = require("http"); // Required to integrate Socket.IO
const { Server } = require("socket.io"); // Import the Socket.IO server
const setupSocket = require("./socket/socket");

const server = http.createServer(app); // Create the HTTP server for Express and Socket.IO
const io = setupSocket(server);

// Connect to MongoDB
// filepath: c:\Users\User\Desktop\Qsocks\Qsockbackend\index.js
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000",
        "https://qsocks.net",
        "http://qsocks.net",
        "https://www.qsocks.net",
        "http://www.qsocks.net",
      ];

      if (
        process.env.Client_Url &&
        !allowedOrigins.includes(process.env.Client_Url)
      ) {
        allowedOrigins.push(process.env.Client_Url);
      }

      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        console.log("CORS blocked for origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.static("public"));
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`Path hit: ${req.originalUrl}`);
  next();
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(express.json());

app.use("/api", auth);
// app.use('/api/chat', chat);
app.use("/api/user", userAuth, user);
app.use("/api/admin", adminAuth, admin);
app.use("/api", payment);

app.use((req, res, next) => {
  console.log(`Path hit: ${req.originalUrl}`);
  console.log("This route does not exist!");
  res.status(404).send("This route does not exist!");
});

const start = async () => {
  await dbConnect();
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

start();
