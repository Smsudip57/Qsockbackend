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
    const history =
      user?.role === "admin"
        ? await History.find().sort({ createdAt: -1 })
        : type
        ? await History.find({ user: user._id, type: type }).sort({
            createdAt: -1,
          })
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
      // locations: [],
    });
  } catch (error) {
    console.log(error);
    // console.error("Error getting residential locations:", error);
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
          const proxyarr = response?.data?.map((item) => {
            if (typeof item === "string") {
              const parts = item.split(":");
              return [`premium.qsocks.net`, parts[1], parts[2], parts[3]].join(
                ":"
              );
            } else {
              return `premium.qsocks.net:${item?.port}:${item?.user}:${item?.pass}`;
            }
          });

          return res.status(200).json({
            success: true,
            message: "Residential proxies generated successfully",
            proxies: proxyarr,
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
      const { country, state, lifetime, city, quantity, rotation, port } =
        req.body;
      const location = `${country}${city}`;
      try {
        const response = await axios.post(
          "https://api.digiproxy.cc/reseller/products/budget-residential/generate",
          {
            port: port,
            location: location,
            lifetime: rotation === "random" ? null : lifetime,
            lifetime: 3,
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
          const proxyarr = response?.data?.map((item) => {
            if (typeof item === "string") {
              const parts = item.split(":");
              return [
                `residential.qsocks.net`,
                parts[1],
                parts[2],
                parts[3],
              ].join(":");
            } else {
              return `residential.qsocks.net:${item?.port}:${item?.user}:${item?.pass}`;
            }
          });
          return res.status(200).json({
            success: true,
            message: "Residential proxies generated successfully",
            proxies: proxyarr,
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
    const plan = type
      ? await Plan.findOne({
          name: type,
        })
      : await Plan.find();
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
    const url = "https://api.proxy-cheap.com/order/configuration";

    const response = await axios.post(
      url,
      {
        networkType: "RESIDENTIAL_STATIC",
        ipVersion: "IPv4",
        proxyProtocol: "SOCKS5",
        authenticationType: "USERNAME_PASSWORD",
      },
      {
        headers: {
          "X-Api-Key": process.env.Proxy_cheap_key,
          "X-Api-Secret": process.env.Proxy_cheap_secret,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: response?.data,
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
          let proxyarr = getOrderInfo?.data?.product?.proxies;
          const historyEntry = new History({
            user: userfromdb._id,
            type: "LTE Mobile Proxies",
            order_id: response?.data?.order_id,
            proxy: proxyarr,
          });
          await historyEntry.save();
          return res.status(200).json({
            success: true,
            message: "Proxy generated successfully",
            user: userfromdb,
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
    } else if (type === "Static Residential Proxies") {
      if (!location || !plan || !quantity || isNaN(quantity) || !country) {
        return res.status(400).json({
          success: false,
          message: "Please provide all the required fields",
        });
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
      const price = targetPlan.price * quantity;
      if (user?.balance < price) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }
      const payload = {
        networkType: "RESIDENTIAL_STATIC",
        ipVersion: "IPv4",
        country: country,
        isp: location,
        proxyProtocol: "SOCKS5",
        authenticationType: "USERNAME_PASSWORD",
        quantity: quantity,
        couponCode: "",
        isAutoExtendEnabled: true,
        autoExtendBandwidth: 0,
      };
      if (plan.includes("m")) {
        const months = plan.split("m")[0];
        payload.months = months;
      } else {
        let days;
        if (plan.includes("w")) {
          const weeksMatch = plan.match(/(\d+)w/);
          if (weeksMatch && weeksMatch[1]) {
            const weeks = parseInt(weeksMatch[1], 10);
            days = (weeks * 7).toString();
          } else {
            days = "7";
          }
        } else {
          days = "7";
        }
        payload.days = days;
      }
      // console.log(payload);
      // return res.status(200).json({
      //   success: true,
      //   payload,
      //   message: "Proxies generated successfully",
      // });
      try {
        // const response = await axios.post(
        //   "https://api.proxy-cheap.com/order/execute",
        //   payload,
        //   {
        //     headers: {
        //       "X-Api-Key": process.env.Proxy_cheap_key,
        //       "X-Api-Secret": process.env.Proxy_cheap_secret,
        //       "Content-Type": "application/json",
        //     },
        //   }
        // );
        // console.log(response?.data);
        // if (response?.data?.error) {
        //   return res.status(400).json({
        //     success: false,
        //     message: "Something went wrong",
        //   });
        // }
        userfromdb.balance = Number(
          (userfromdb.balance - price * quantity).toFixed(2)
        );
        userfromdb.save();
        const getOrderInfo = await axios.get(
          // `https://api.proxy-cheap.com/orders/${response?.data?.id}/proxies`,
          `https://api.proxy-cheap.com/orders/84b357d1-0fcf-11f0-8647-0204b4dab599/proxies`,
          {
            headers: {
              "X-Api-Key": process.env.Proxy_cheap_key,
              "X-Api-Secret": process.env.Proxy_cheap_secret,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(getOrderInfo?.data);
        if (!getOrderInfo?.data?.code) {
          try {
            if (!Array.isArray(getOrderInfo?.data)) {
              return res.status(400).json({
                success: false,
                message: "Something went wrong",
              });
            }
            const historyEntries = [];
            const savePromises = getOrderInfo.data.map(async (proxy) => {
              const formatedProxy = `${proxy?.connection?.publicIp}:${proxy?.connection?.socks5Port}:${proxy?.authentication?.username}:${proxy?.authentication?.password}`;
              const historyEntry = new History({
                user: userfromdb._id,
                type: type,
                // order_id: response?.data?.id,
                order_id: "84b357d1-0fcf-11f0-8647-0204b4dab599",
                proxy: formatedProxy,
              });
              const savedEntry = await historyEntry.save();
              historyEntries.push(savedEntry);
            });
            await Promise.all(savePromises);
            return res.status(200).json({
              success: true,
              message: "Proxies generated successfully",
              user: userfromdb,
              proxies: historyEntries.map((entry) => entry.toObject()),
            });
          } catch (error) {
            console.error("Error saving proxy history:", error);
            return res.status(500).json({
              success: false,
              message: "Error saving proxy data",
            });
          }
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
    }
    return res.status(400).json({
      success: false,
      message: "Something went wrong",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.post("/get_plan", async (req, res) => {
  try {
    const { type, amount } = req.body;
    const user = req?.user;
    if (
      !type ||
      !["Premium Residential Proxies", "Budget Residential Proxies"].includes(
        type
      ) ||
      !amount ||
      isNaN(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type",
      });
    }
    const targetPlans = await Plan.findOne({
      name: type,
    });
    if (!targetPlans) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type",
      });
    }
    const plan = targetPlans.plans?.find((p) => p.amount === amount);
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan!",
      });
    }
    if (user?.balance < plan.price) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }
    const credentials =
      type === "Premium Residential Proxies"
        ? user?.ResidentialCredentials?.id
        : user?.BudgetResidentialCredentials?.id;
    const url =
      type === "Premium Residential Proxies"
        ? "https://api.digiproxy.cc/reseller/presidential/sub-users/create"
        : "https://api.digiproxy.cc/reseller/budget-residential/sub-users/create";

    const trafficUrl = (id) => {
      return type === "Premium Residential Proxies"
        ? `https://api.digiproxy.cc/reseller/presidential/sub-users/${id}/traffic/give`
        : `https://api.digiproxy.cc/reseller/budget-residential/sub-users/${id}/traffic/give`;
    };
    const userfromdb = await User.findById(user._id);
    if (!credentials) {
      const response = await axios.post(
        url,
        {
          email: user.email,
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
      if (type === "Premium Residential Proxies") {
        userfromdb.ResidentialCredentials = response?.data;
      } else {
        userfromdb.BudgetResidentialCredentials = response?.data;
      }
      if (amount > 0) {
        //give more traffic
        const giveTraffic = await axios.post(
          trafficUrl(response?.data?.id),
          {
            amount: amount ,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.Key}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!giveTraffic?.data || giveTraffic?.data?.error) {
          userfromdb.balance = Number(
            (userfromdb.balance - plan.price).toFixed(2)
          );
          userfromdb.save();
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        } else {
          if (type === "Premium Residential Proxies") {
            userfromdb.ResidentialCredentials = {
              ...response?.data,
              availableTraffic: amount,
            };
          } else {
            userfromdb.BudgetResidentialCredentials = {
              ...response?.data,
              availableTraffic: amount,
            };
          }
          userfromdb.balance = Number(
            (userfromdb.balance - plan.price).toFixed(2)
          );
          userfromdb.save();
          return res.status(200).json({
            success: true,
            message: "Plan purchased successfully",
            user: userfromdb,
          });
        }
      } else {
        userfromdb.balance = Number(
          (userfromdb.balance - plan.price).toFixed(2)
        );
        userfromdb.save();
        return res.status(200).json({
          success: true,
          message: "Plan purchased successfully",
          user: userfromdb,
        });
      }
    } else {
      const giveTraffic = await axios.post(
        trafficUrl(credentials),
        {
          amount: amount,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.Key}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!giveTraffic?.data || giveTraffic?.data?.error) {
        return res.status(400).json({
          success: false,
          message: "Something went wrong",
        });
      } else {
        if (type === "Premium Residential Proxies") {
          userfromdb.ResidentialCredentials = {
            ...userfromdb.ResidentialCredentials,
            availableTraffic:
              userfromdb.ResidentialCredentials.availableTraffic + amount,
          };
        } else {
          userfromdb.BudgetResidentialCredentials = {
            ...userfromdb.BudgetResidentialCredentials,
            availableTraffic:
              userfromdb.BudgetResidentialCredentials.availableTraffic + amount,
          };
        }
        userfromdb.balance = Number(
          (userfromdb.balance - plan.price).toFixed(2)
        );
        userfromdb.save();
        return res.status(200).json({
          success: true,
          message: "Plan purchased successfully",
          user: userfromdb,
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.get("/get_starts", async (req, res) => {
  try {
    const user = req?.user;
    let budgetStat = { availableTraffic: 0, usedTraffic: 0 };
    let premiumStat = { availableTraffic: 0, usedTraffic: 0 };
    const userfromdb = await User.findById(user._id);
    if (user?.BudgetResidentialCredentials?.id) {
      const request = await axios.get(
        `https://api.digiproxy.cc/reseller/residential/sub-users/${user?.BudgetResidentialCredentials?.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.Key}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (request?.data && !request?.data?.error) {
        budgetStat = {
          availableTraffic: request?.data?.availableTraffic,
          usedTraffic: request?.data?.usedTraffic,
        };
        userfromdb.BudgetResidentialCredentials = {
          ...userfromdb.BudgetResidentialCredentials,
          availableTraffic: request?.data?.availableTraffic,
          usedTraffic: request?.data?.usedTraffic,
        };
      }
    }
    if (user?.ResidentialCredentials) {
      const request = await axios.get(
        `https://api.digiproxy.cc/reseller/residential/sub-users/${user?.ResidentialCredentials?.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.Key}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (request?.data && !request?.data?.error) {
        premiumStat = {
          availableTraffic: request?.data?.availableTraffic,
          usedTraffic: request?.data?.usedTraffic,
        };
        userfromdb.ResidentialCredentials = {
          ...userfromdb.ResidentialCredentials,
          availableTraffic: request?.data?.availableTraffic,
          usedTraffic: request?.data?.usedTraffic,
        };
      }
    }
    userfromdb.save();
    return res.status(200).json({
      success: true,
      budgetStat,
      premiumStat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

module.exports = router;
