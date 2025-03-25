const express = require("express");
const router = express.Router();
const Transactions = require("../models/transactions");
const User = require("../models/user");
const crypto = require("crypto");
const { adminAuth, userAuth } = require("../middlewares/Auth");
const { default: axios } = require("axios");
const secretpassword = "myNameisSudipYouknowwhatareyoudoing";

router.post("/payment", userAuth, async (req, res) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount is required." });
    }

    let orderid = "ORD" + Math.floor(Math.random() * 1000000);
    let order = await Transactions.findOne({ OrderID: orderid });
    while (order) {
      orderid = "ORD" + Math.floor(Math.random() * 1000000);
      order = await Transactions.findOne({ OrderID: orderid });
    }

    const additionalData = JSON.stringify({
        userId: req.user._id,
        secretpassword,
    })
    const paymentData = {
      amount: parseFloat(amount).toFixed(2),
      currency: "USDT",
      order_id: orderid,
      to_currency: "USDT",
      lifetime: 600,
      additional_data: additionalData,
      url_success: `https://qsocks.net/payment/status${orderid}`,
      url_failure: `https://qsocks.net/payment/status${orderid}`,
      url_callback: `https://api.qsocks.net/payment/status`,
    };

    const jsonString = JSON.stringify(paymentData);
    const base64Data = Buffer.from(jsonString).toString("base64");
    const apiKey =
      "zuOF61ZJzxwB77Bl7aBUbyAY4f1AJDbjfRyU7ZflGuvY9mSf4eFVkjNZjOvmFLCbUkxUmIVvTrXDZl84bKbnKnCXeEhGhZnrEeBnchD4WNMowNzg5r6C2eHHiM4TOJtr";
    const sign = crypto
      .createHash("md5")
      .update(base64Data + apiKey)
      .digest("hex");

    console.log("Base64 encoded:", base64Data);
    console.log("Generated sign:", sign);

    // 3. Send the request with the ORIGINAL DATA in body (not base64)
    const response = await axios.post(
      "https://api.cryptomus.com/v1/payment",
      paymentData, // Send original data object, NOT base64 encoded
      {
        headers: {
          "Content-Type": "application/json",
          merchant: "fc2d156e-2d57-4d03-a3c1-cd2c735bbe69",
          sign: sign,
        },
      }
    );
    return res
      .status(200)
      .json({ success: true, url: response?.data?.result?.url });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
});

router.post("/payment/status", async (req, res) => {
  try {
    const signature = req.headers.sign;

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Missing signature in headers",
      });
    }

    const payload = req.body;

    const payloadCopy = { ...payload };
    if (payloadCopy?.sign) delete payloadCopy.sign;

    const data = Buffer.from(JSON.stringify(payloadCopy)).toString("base64");
    const apiKey =
      "zuOF61ZJzxwB77Bl7aBUbyAY4f1AJDbjfRyU7ZflGuvY9mSf4eFVkjNZjOvmFLCbUkxUmIVvTrXDZl84bKbnKnCXeEhGhZnrEeBnchD4WNMowNzg5r6C2eHHiM4TOJtr";
    const calculatedSignature = crypto
      .createHash("md5")
      .update(data + apiKey)
      .digest("hex");

    if (calculatedSignature !== signature) {
      return res.status(403).json({
        success: false,
        message: "Invalid signature",
      });
    }

    // The signature is valid, process the payment notification
    console.log("Payment notification received:", payload);

    // Extract payment details
    const { order_id, status, amount, currency } = payload;

    const additionalData = JSON.parse(payload?.additional_data);
    if (additionalData?.secretpassword !== secretpassword) {
      return res.status(403).json({
        success: false,
        message: "Invalid additional data",
      });
    }

    // Update transaction status in your database
    const transaction = new Transactions({
      OrderID: order_id,
      Amount: amount,
      userId: additionalData?.userId,
    });
    await transaction.save();

    // If payment is successful, update user balance
    if (["paid","paid_over", 'wrong_amount'].includes(status)) {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance = (parseFloat(user.balance) || 0) + parseFloat(amount);
        await user.save();
      }
    }

    // Send response to Cryptomus
    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing webhook",
    });
  }
});

// ...existing code...

module.exports = router;
