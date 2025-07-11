const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const dbConnect = require("./dbConnect/dbConnect"); // Import the database connection
const auth = require("./routes/auth");
const chat = require("./routes/chat");
const payment = require("./routes/payment");
const user = require("./routes/user");
const admin = require("./routes/admin");
const { adminAuth, userAuth } = require("./middlewares/Auth");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

const http = require("http"); // Required to integrate Socket.IO
const { Server } = require("socket.io"); // Import the Socket.IO server
const setupSocket = require("./socket/socket");

const server = http.createServer(app); // Create the HTTP server for Express and Socket.IO
const io = setupSocket(server);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://qsocks.net",
      "https://www.qsocks.net",
      process.env.Client_Url,
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);
app.use(express.static("public"));
app.use(cookieParser());

app.use((req, res, next) => {
  next();
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(express.json());

app.use("/api", auth);
app.use("/api/chat", chat);
app.use("/api/user", userAuth, user);
app.use("/api/admin", adminAuth, admin);
app.use("/api", payment);

app.use((req, res, next) => {
  res.status(404).send("This route does not exist!");
});

const start = async () => {
  await dbConnect();
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

start();
