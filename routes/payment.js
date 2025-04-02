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
    const { amount, method, currency } = req.body;
    if (!amount || amount <= 0 || !["DOGE", "TRX", "LTC", "USDT" ].includes(currency)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
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
    });
    const paymentData = {
      amount: parseFloat(amount).toFixed(2),
      currency: "USD",
      order_id: orderid,
      to_currency: currency,
      lifetime: 3600,
      additional_data: additionalData,
      url_success: `${process.env.Client_Url}/payment/status/${orderid}`,
      url_failure: `${process.env.Client_Url}/payment/status/${orderid}`,
      url_callback: `${process.env.Current_Url}/payment/status`,
    };

    const jsonString = JSON.stringify(paymentData);
    const base64Data = Buffer.from(jsonString).toString("base64");
    const apiKey =
      "zuOF61ZJzxwB77Bl7aBUbyAY4f1AJDbjfRyU7ZflGuvY9mSf4eFVkjNZjOvmFLCbUkxUmIVvTrXDZl84bKbnKnCXeEhGhZnrEeBnchD4WNMowNzg5r6C2eHHiM4TOJtr";
    const sign = crypto
      .createHash("md5")
      .update(base64Data + apiKey)
      .digest("hex");
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

    console.log("Payment notification received:", payload);
    const { order_id, status, amount, currency } = payload;

    const additionalData = JSON.parse(payload?.additional_data);
    if (additionalData?.secretpassword !== secretpassword) {
      return res.status(403).json({
        success: false,
        message: "Invalid additional data",
      });
    }

    if (["paid", "paid_over", "wrong_amount"].includes(status)) {
      let transaction = await Transactions.findOne({ OrderID: order_id });
      if (!transaction) {
        transaction = new Transactions({
          OrderID: order_id,
          Amount: amount,
          userId: additionalData?.userId,
        });
        await transaction.save();
      } else {
       return  res.status(200).json({
          success: true,
          message: "Webhook processed successfully",
        });
      }

      // If payment is successful, update user balance
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
