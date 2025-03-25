const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }
    user.password = undefined;

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.cookie("user", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: user,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while logging in." });
  }
});

router.post("/register_verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser?.isActive) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000);
    if (
      existingUser &&
      Date.now() - existingUser.varificationcode.createdAt < 60000
    ) {
      return res.status(409).json({
        success: false,
        message: `Please wait for ${(
          (60000 - (Date.now() - existingUser.varificationcode.createdAt)) /
          1000
        ).toFixed(0)} seconds before requesting a new code.`,
      });
    }
    if (!existingUser) {
      await User.create({
        email,
        profile: {
          name: email.split("@")[0],
        },
        varificationcode: {
          code: code,
          createdAt: Date.now(),
        },
      });
    } else {
      await User.findOneAndUpdate(
        { email },
        {
          varificationcode: {
            code: code,
            createdAt: Date.now(),
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      // message: 'Verification code sent successfully.',
      message: `Your verification code is ${code}`,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    const mongooseerror = error.message
      ? error.message.split(":").shift().trim()
      : null;
    return res.status(500).json({
      success: false,
      message: mongooseerror || "An error occurred during registration.",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { code, email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(409).json({
        success: false,
        message: "Validation code is incorrect.",
      });
    }

    if (
      existingUser.varificationcode.code !== code ||
      Date.now() - existingUser.varificationcode.createdAt > 60000
    ) {
      return res.status(409).json({
        success: false,
        message: `Validation code is ${
          existingUser.varificationcode.code !== code ? "incorrect" : "expired"
        }.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    existingUser.password = hashedPassword;
    existingUser.isActive = true;
    const newUser = await existingUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET);

    newUser.password = undefined;

    res.cookie("user", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });
    // res.cookie('user', token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   path: '/',
    // });

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: newUser,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    const mongooseerror = error.message
      ? error.message.split(":").pop().trim()
      : null;
    return res.status(500).json({
      success: false,
      message: mongooseerror || "An error occurred during registration.",
    });
  }
});

router.get("/getuserinfo", async (req, res) => {
  try {
    const emptyObject = {
      url_callback: "25",
      currency: "USDT",
      status: "Paid",
      network: "tron",
    };
    const jsonString = JSON.stringify(emptyObject);
    const base64Data = Buffer.from(jsonString).toString("base64");
    const apiKey =
      "zuOF61ZJzxwB77Bl7aBUbyAY4f1AJDbjfRyU7ZflGuvY9mSf4eFVkjNZjOvmFLCbUkxUmIVvTrXDZl84bKbnKnCXeEhGhZnrEeBnchD4WNMowNzg5r6C2eHHiM4TOJtr";
    const sign = crypto
      .createHash("md5")
      .update(base64Data + apiKey)
      .digest("hex");

    console.log("Base64 encoded:", base64Data);
    console.log("Generated sign:", sign);

    const token = req.cookies.user;
    if (!token) {
      return res.status(401).json({
        error: "Authentication token is missing.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        error: "Invalid or expired token.",
      });
    }

    const { userId } = decoded;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully.",
      user: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      error: "An error occurred while fetching the user.",
    });
  }
});

router.get("/user/logout", (req, res) => {
  try {
    res.cookie("user", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({ error: "An error occurred during logout." });
  }
});

module.exports = router;
