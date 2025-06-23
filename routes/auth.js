const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { default: axios } = require("axios");
const JWT_SECRET = process.env.JWT_SECRET;

const transporter = nodemailer.createTransport({
  host: "premium247.web-hosting.com",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@qsocks.net",
    pass: "xY8Hvai4uMjjA2s",
  },
  connectionTimeout: 10000, 
  greetingTimeout: 10000
});

async function sendVerificationEmail(toEmail, verificationCode) {
  try {
    const mailOptions = {
      from: '"Qsocks Support" <noreply@qsocks.net>',
      to: toEmail,
      subject: "Your Verification Code",
      text: `Your verification code is: ${verificationCode}`,
      html: `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Your QSocks Verification Code</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          max-width: 150px;
          margin: 0 auto;
          display: block;
        }
        .content {
          padding: 30px 20px;
          text-align: center;
        }
        .verification-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #33BA57;
          padding: 15px;
          margin: 20px 0;
          background-color:rgba(51, 186, 87, 0.12);
          border-radius: 6px;
          display: inline-block;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #eee;
        }
        .note {
          font-size: 14px;
          margin: 20px 0;
          padding: 10px;
          background-color: #fffef0;
          border-left: 4px solid #ffd700;
          text-align: left;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          margin: 20px 0;
          background-color: #33BA57;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        }
        a{
          color: #33BA57!important;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${process.env.Client_Url}/logo.png" alt="QSocks Logo" class="logo" />
          <h2>Email Verification</h2>
        </div>
        
        <div class="content">
          <h3>Hello!</h3>
          <p>Thank you for choosing Qsocks. To complete your registration, please use the verification code below:</p>
          
          <div class="verification-code">${verificationCode}</div>
          
          <p>This code will expire in 60 seconds.</p>
          
          <div class="note">
            <strong>Security Note:</strong> If you didn't request this code, please ignore this email or contact our support team.
          </div>
          
          <p>Need help? <a href="https://qsocks.net/support">Contact our support team</a></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 QSocks. All rights reserved.</p>
          <p>Your privacy is important to us. View our <a href="https://qsocks.net/privacy">Privacy Policy</a>.</p>
        </div>
      </div>
    </body>
    </html>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.response);
    return true;
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
}

async function sendForgotPasswordEmail(toEmail, verificationCode) {
  try {
    const mailOptions = {
      from: '"Qsocks Support" <noreply@qsocks.net>',
      to: toEmail,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${verificationCode}. This code will expire in 1 hour.`,
      html: `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>QSocks Password Reset Code</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          max-width: 150px;
          margin: 0 auto;
          display: block;
        }
        .content {
          padding: 30px 20px;
          text-align: center;
        }
        .verification-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #33BA57;
          padding: 15px;
          margin: 20px 0;
          background-color:rgba(51, 186, 87, 0.12);
          border-radius: 6px;
          display: inline-block;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #eee;
        }
        .note {
          font-size: 14px;
          margin: 20px 0;
          padding: 10px;
          background-color: #fffef0;
          border-left: 4px solid #ffd700;
          text-align: left;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          margin: 20px 0;
          background-color: #33BA57;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        }
        a{
          color: #33BA57!important;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${process.env.Client_Url}/logo.png" alt="QSocks Logo" class="logo" />
          <h2>Password Reset</h2>
        </div>
        
        <div class="content">
          <h3>Hello!</h3>
          <p>We received a request to reset your password. Please use the code below to reset your password:</p>
          
          <div class="verification-code">${verificationCode}</div>
          
          <p>This code will expire in 1 hour.</p>
          
          <div class="note">
            <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email or contact our support team immediately.
          </div>
          
          <p>Need help? <a href="https://qsocks.net/support">Contact our support team</a></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 QSocks. All rights reserved.</p>
          <p>Your privacy is important to us. View our <a href="https://qsocks.net/privacy">Privacy Policy</a>.</p>
        </div>
      </div>
    </body>
    </html>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent: ", info.response);
    return true;
  } catch (error) {
    console.error("Error sending password reset email: ", error);
    return false;
  }
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
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
        message: "Invalid email or password.",
      });
    }
    if(user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended.",
      });
    }
    user.password = undefined;

    const refreshtoken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    res.cookie("refresh", refreshtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // domain: ".qsocks.net"
      path: "/",
    });
    const accesstoken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("access", accesstoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      
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
      .json({ message: "An error occurred while logging in." });
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
    const emailSent = await sendVerificationEmail(email, code);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email.",
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
      message: "Verification code sent successfully.",
      // message: `Your verification code is ${code}`,
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

router.post("/forgot_verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser?.isActive) {
      return res.status(409).json({
        success: false,
        message: "Email is not found.",
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
          60000
        ).toFixed(0)} secends before requesting a new code.`,
      });
    }
    const emailSent = await sendForgotPasswordEmail(email, code);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email.",
      });
    }
    await User.findOneAndUpdate(
      { email },
      {
        varificationcode: {
          code: code,
          createdAt: Date.now(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Verification code sent successfully.",
      // message: `Your verification code is ${code}`,
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    const mongooseerror = error.message
      ? error.message.split(":").shift().trim()
      : null;
    return res.status(500).json({
      success: false,
      message: mongooseerror || "An error occurred during registration.",
    });
  }
});

router.post("/reset_password", async (req, res) => {
  try {
    const { email, code, password, confirmPassword } = req.body;

    // Validate required fields
    if (!email || !code || !password || !confirmPassword) {
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      user.varificationcode.code !== code ||
      Date.now() - user.varificationcode.createdAt > 3600000
    ) {
      return res.status(400).json({
        success: false,
        message: `Verification code is ${user.varificationcode.code !== parseInt(code)
            ? "incorrect"
            : "expired"
          }.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.varificationcode = {
      code: null,
      createdAt: null,
    };

    await user.save();
    user.password = undefined;
    const refreshtoken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    res.cookie("refresh", refreshtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      
      path: "/",
    });

    const accesstoken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("access", accesstoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      
      path: "/",
    });
    return res.status(200).json({
      success: true,
      message: "Password reset successful.",
      user: user,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    const mongooseError = error.message
      ? error.message.split(":").shift().trim()
      : null;
    return res.status(500).json({
      success: false,
      message: mongooseError || "An error occurred during password reset.",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { code, email, password, confirmPassword, refCode } = req.body;

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
        message: `Validation code is ${existingUser.varificationcode.code !== code ? "incorrect" : "expired"
          }.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generateRefCode = () => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const assignUniqueRefCode = async (user) => {
      let isUnique = false;
      let refCode;

      while (!isUnique) {
        refCode = generateRefCode();
        const existingCodeUser = await User.findOne({ refCode });
        if (!existingCodeUser) {
          isUnique = true;
        }
      }
      user.refCode = refCode;
      return user;
    };

    existingUser.password = hashedPassword;
    existingUser.isActive = true;
    await assignUniqueRefCode(existingUser);
    if (refCode) {
      const referer = await User.findOne({ refCode: refCode });
      if (referer) {
        existingUser.referedBy = referer._id;
      }
    }
    const newUser = await existingUser.save();
    newUser.password = undefined;

    const refreshtoken = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    res.cookie("refresh", refreshtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      
      path: "/",
    });
    const accesstoken = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    res.cookie("access", accesstoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      
      path: "/",
    });

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

router.post("/google-getway", async (req, res) => {
  try {
    const { name, email, photoURL, googleId, refCode } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: "Something went wrong.",
      });
    }

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const generateRefCode = () => {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < 10; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const assignUniqueRefCode = async () => {
        let isUnique = false;
        let generatedRefCode;

        while (!isUnique) {
          generatedRefCode = generateRefCode();
          const existingCodeUser = await User.findOne({
            refCode: generatedRefCode,
          });
          if (!existingCodeUser) {
            isUnique = true;
          }
        }

        return generatedRefCode;
      };

      const userRefCode = await assignUniqueRefCode();

      let referrerId = null;
      if (refCode) {
        const referer = await User.findOne({ refCode });
        if (referer) {
          referrerId = referer._id;
        }
      }

      user = new User({
        email,
        googleId,
        isActive: true,
        profile: {
          name: name || email.split("@")[0],
          avatarUrl: photoURL,
        },
        refCode: userRefCode,
        referedBy: referrerId,
        balance: 0,
      });

      await user.save();
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
      }

      if (photoURL && (!user.profile || !user.profile.photo)) {
        if (!user.profile) user.profile = {};
        user.profile.avatarUrl = photoURL;
      }

      await user.save();
    }
    user.password = undefined;

    const refreshtoken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    res.cookie("refresh", refreshtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      
      path: "/",
    });
    const accesstoken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("access", accesstoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      
      path: "/",
    });

    // Return response
    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser ? "Registration successful." : "Login successful.",
      user: user,
    });
  } catch (error) {
    console.error("Error during Google authentication:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during Google authentication.",
    });
  }
});

router.get("/getuserinfo", async (req, res) => {
  try {
    // try {
    //   const response = await axios.post('http://localhost:3001/api/admin/create_plan', {
    //     name:"1 Week", price:2.7, type:"Static Residential Proxies", id:"1d", note:"Weekly Blaze", tag:"Weekend"
    //   })
    // } catch (error) {

    // }
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

    const accessToken = req.cookies.access;
    const refreshToken = req.cookies.refresh;
    if (!accessToken && !refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    let access;
    try {
      access = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (error) { }

    let refresh;
    try {
      refresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      res.clearCookie("refresh", { path: "/" });
      res.clearCookie("access", { path: "/" });
      return res.status(403).json({
        success: false,
        message: "Your session has expired",
      });
    }
    if (!refresh) {
      res.clearCookie("refresh", { path: "/" });
      res.clearCookie("access", { path: "/" });
      return res.status(403).json({
        success: false,
        message: "Your session has expired",
      });
    }

    const { userId } = refresh;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.clearCookie("refresh", { path: "/" });
      res.clearCookie("access", { path: "/" });
      return res.status(404).json({
        success: false,
        message: "Unauthorized",
      });
    }
    if (user.isSuspended) {
      res.clearCookie("refresh", { path: "/" });
      res.clearCookie("access", { path: "/" });
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended",
      });
    }
    if (!access) {
      const refreshtoken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "30d",
        }
      );
      res.cookie("refresh", refreshtoken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        
        path: "/",
      });
      const accesstoken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );
      res.cookie("access", accesstoken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        
        path: "/",
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
    res.clearCookie("refresh", {
      path: "/",
      
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
    res.clearCookie("access", {
      path: "/",
      
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
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
