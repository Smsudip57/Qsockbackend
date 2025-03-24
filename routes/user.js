const express = require("express");
const User = require("../models/user");
const Plan = require("../models/plans");
const History = require("../models/proxyhistory");
const router = express.Router();
const axios = require("axios");

router.get("/proxy_history", async (req, res) => {
  try {
    const user = req?.user;
    const { type } = req.query;
    if (!user?.role === "admin" && !type) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }
    const history =
       user?.role === "admin"
        ? await History.find().sort({ createdAt: -1 })
        : await History.find({ user: user._id }).sort({ createdAt: -1 });

    const filteredHistory = history.filter((entry) =>
      type ? entry.type === type : true
    );
    return res.status(200).json({
      success: true,
      history: filteredHistory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.get("/residential_location", async (req, res) => {
  try {
    const user = req?.user;
    const locations = await axios.get(
      "https://api.digiproxy.cc/reseller/products/presidential/countries",
      {
        headers: {
          Authorization: `Bearer ${process.env.Key}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.status(200).json({
      success: true,
      locations: locations?.data,
    });
  } catch (error) {
    console.error("Error getting residential locations:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while getting residential locations",
    });
  }
});

router.get("/budget_residential_location", async (req, res) => {
  try {
    const user = req?.user;
    const locations = await axios.get(
      "https://api.digiproxy.cc/reseller/products/budget-residential/countries",
      {
        headers: {
          Authorization: `Bearer ${process.env.Key}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.status(200).json({
      success: true,
      locations: locations?.data,
    });
  } catch (error) {
    console.error("Error getting residential locations:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while getting residential locations",
    });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const user = req?.user;
    if (user?.ResidentialCredentials?.availableTraffic > 0) {
      const { country, state, city, quantity, rotation, port } = req.body;
      const location = `${country}_${state}_${city}`;
      try {
        const response = await axios.post(
          "https://api.digiproxy.cc/reseller/products/presidential/generate",
          {
            port: port,
            location: location,
            count: quantity,
            rotation: rotation,
            subuser: user?.ResidentialCredentials?.id,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.Key}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response?.data?.error) {
          return res.status(200).json({
            success: true,
            message: "Residential proxies generated successfully",
            proxies: response?.data,
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Error! Please try again",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "You dont have any traffic left, Please buy more traffic.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.post("/generate_budget", async (req, res) => {
  try {
    const user = req?.user;
    if (user?.BudgetResidentialCredentials?.availableTraffic > 0) {
      const { country, state, city, quantity, rotation, port } = req.body;
      const location = `${country}${city}`;
      try {
        const response = await axios.post(
          "https://api.digiproxy.cc/reseller/products/budget-residential/generate",
          {
            port: port,
            location: location,
            lifetime: 1440,
            count: quantity,
            rotation: rotation,
            subuser: user?.BudgetResidentialCredentials?.id,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.Key}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response?.data?.error) {
          return res.status(200).json({
            success: true,
            message: "Residential proxies generated successfully",
            proxies: response?.data,
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Error! Please try again",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "You dont have any traffic left, Please buy more traffic.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.get("/plan", async (req, res) => {
  try {
    const { type } = req.query;
    const plan = await Plan.findOne({
      name: type,
    });
    return res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.get("/lte_credentials", async (req, res) => {
  try {
    const url = "https://api.digiproxy.cc/reseller/products/lte/available";
    const { country } = req.query;
    const response = await axios.get(url, {
      params: country ? { country: country } : {},
      headers: {
        Authorization: `Bearer ${process.env.Key}`,
        "Content-Type": "application/json",
      },
    });
    return res.status(200).json({
      success: true,
      data: response?.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.get("/server_credentials", async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }
    const url = "https://api.digiproxy.cc/reseller/products/servers/available";

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.Key}`,
        "Content-Type": "application/json",
      },
    });
    if (response?.data?.error) {
      return res.status(400).json({
        success: false,
        message: "Something went wrong",
      });
    }
    const targetCredentials = response?.data?.find(
      (cred) => cred?.name === type
    );

    if (!targetCredentials) {
      return res.status(400).json({
        success: false,
        message: "Invalid type",
      });
    }

    return res.status(200).json({
      success: true,
      data: targetCredentials?.locations,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.post("/get_proxy", async (req, res) => {
  try {
    const url = "https://api.digiproxy.cc/reseller/payments/purchase";
    const { type, country, state, city, location, plan, quantity } = req.body;
    const user = req?.user;
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Plan type is required",
      });
    }
    const userfromdb = await User.findById(user._id);
    if (type === "LTE Mobile Proxies") {
      if (!location) {
        return res.status(400).json({
          success: false,
          message: "Country and City are required",
        });
      }
      const targetplan = await Plan.findOne({
        name: type,
      });
      if (!targetplan) {
        return res.status(400).json({
          success: false,
          message: "Not available",
        });
      }
      const price = targetplan.plans[0].price;
      if (user?.balance < price) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }
      console.log(targetplan, location);
      try {
        const response = await axios.post(
          url,
          {
            product: {
              id: targetplan.productId,
            },
            plan: {
              id: location,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.Key}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(response?.data);
        if (response?.data?.error) {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
        userfromdb.balance = userfromdb.balance - price;
        userfromdb.save();

        const getOrderInfo = await axios.get(
          `https://api.digiproxy.cc/reseller/account/orders/${response?.data?.order_id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.Key}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!getOrderInfo?.data?.error) {
          const historyEntry = new History({
            user: userfromdb._id,
            type: "LTE Mobile Proxies",
            order_id: response?.data?.order_id,
            proxy: getOrderInfo?.data?.product?.proxies,
          });
          await historyEntry.save();
          return res.status(200).json({
            success: true,
            message: "Proxies generated successfully",
            proxies: historyEntry.toObject(),
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Error! Please try again",
        });
      }
    }else if(["Static Residential Proxies", "Datacenter Proxies", "Datacenter IPv6 Proxies"].includes(type)){
      if(!location || !plan || !quantity || isNaN(quantity)){
        return res.status(400).json({
          success: false,
          message: "Please provide all the required fields",
      })
    }
      const mainPlan = await Plan.findOne({
        name: type,
      });
      if (!mainPlan) {
        return res.status(400).json({
          success: false,
          message: "Not available",
        });
      }
      const targetPlan = mainPlan.plans?.find((p) => p.id === plan);
      if (!targetPlan) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan",
        });
      }
      const price = targetPlan.price*quantity;
      if (user?.balance < price) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }
      try {
        const response = await axios.post(
          url,
          {
            product: {
              id: mainPlan.productId,
            },
            plan: {
              id: plan,
              location: location,
              quantity: 1,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.Key}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (response?.data?.error) {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
        userfromdb.balance = userfromdb.balance - price;
        userfromdb.save();
        const getOrderInfo = await axios.get(
          `https://api.digiproxy.cc/reseller/account/orders/${response?.data?.order_id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.Key}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!getOrderInfo?.data?.error) {
          const historyEntry = new History({
            user: userfromdb._id,
            type: type,
            order_id: response?.data?.order_id,
            proxy: getOrderInfo?.data?.product?.proxies,
          });
          await historyEntry.save();
          return res.status(200).json({
            success: true,
            message: "Proxies generated successfully",
            proxies: historyEntry.toObject(),
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
      }catch (error) {
        return res.status(400).json({
          success: false,
          message: "Error! Please try again",
        });
      }
    }
  } catch (error) {}
});

module.exports = router;
