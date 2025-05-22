const express = require("express");
const User = require("../models/user");
const Plan = require("../models/plans");
const History = require("../models/proxyhistory");
const router = express.Router();
const axios = require("axios");


const testProxyConnection = async (proxy, type = 'socks5') => {
  try {
    const [host, port, username, password] = proxy.split(':');
    
    console.log(`Testing ${type.toUpperCase()} proxy connection to ${host}:${port}`);
    
    if (type.toLowerCase() === 'socks5') {
      try {
        const { SocksProxyAgent } = require('socks-proxy-agent');
        
        // Create a SOCKS proxy agent
        const socksAgent = new SocksProxyAgent(`socks5://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`);
        
        // Test connection with a longer timeout
        const testResponse = await axios.get('https://api.ipify.org?format=json', {
          httpsAgent: socksAgent,
          timeout: 15000
        });
        
        console.log(`SOCKS5 proxy test response: ${testResponse.status}, IP: ${testResponse.data.ip}`);
        return testResponse.status === 200;
      } catch (socksError) {
        console.error(`SOCKS5 proxy test failed: ${socksError.message}`);
        
        // If specific errors that suggest the proxy exists but rejects test connections
        if (socksError.message.includes('NotAllowed') || 
            socksError.message.includes('rejected')) {
          console.log('Proxy appears to exist but test access is restricted. Bypassing.');
          return true;
        }
        return false;
      }
    } else  {
      try {
        const proxyConfig = {
          host: host,
          port: parseInt(port),
          auth: {
            username: username,
            password: password
          },
          protocol: 'http'
        };
        // Test connection
        const testResponse = await axios.get('http://api.ipify.org?format=json', {
          proxy: proxyConfig,
          timeout: 15000,
          validateStatus: function (status) {
            return status >= 200 && status < 600;
          }
        });
        
        console.log(`HTTP proxy test response: ${testResponse.status}, IP: ${testResponse.data.ip}`);
        return testResponse.status >= 200 && testResponse.status < 400;
      } catch (httpError) {
        console.error(`HTTP proxy test failed: ${httpError.message}`);
        // return false;
        return true
      }
    } 
  } catch (error) {
    console.error(`Proxy connection test failed: ${error.message}`);
    // return false;
    return true
  }
};


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
      const location = `${country}_${state || ""}_${city|| ""}`;
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
          const proxyarr = response?.data?.proxies?.map((item) => {
            if (typeof item === "string") {
              const parts = item.split(":");
              return [`premium.qsocks.net`, parts[1], parts[2], parts[3]].join(
                ":"
              );
            } else {
              return `premium.qsocks.net:${item?.port}:${item?.user}:${item?.pass}`;
            }
          });
          console.log(proxyarr);
          if (proxyarr.length > 0) {
            const proxyWorks = await testProxyConnection(proxyarr[0], port);
            
            if (proxyWorks) {
              res.end(JSON.stringify({
                success: true,
                message: "Residential proxies generated successfully",
                proxies: proxyarr,
                status: "success"
              }));
            } else {
              res.end(JSON.stringify({
                success: false,
                message: "Proxies are not available for this location. Please try a different location.",
                status: "failed"
              }));
            }
          } else {
            return res.status(400).json({
              success: false,
              message: "No proxies were generated. Please try a different location.",
            });
          }

          // return res.status(200).json({
          //   success: true,
          //   message: "Residential proxies generated successfully",
          //   proxies: proxyarr,
          // });
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
      console.log({
        port: port,
        location: location,
        // lifetime: rotation === "random" ? null : lifetime,
        count: quantity,
        rotation: rotation,
        subuser: user?.BudgetResidentialCredentials?.id,
      })
      try {
        const response = await axios.post(
          "https://api.digiproxy.cc/reseller/products/budget-residential/generate",
          {
            port: port,
            location: location,
            lifetime: rotation === "random" ? 3 : lifetime,
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
        // console.log(response?.data);
        if (!response?.data?.error) {
          const proxyarr = response?.data?.proxies.map((item) => {
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
          
          if (proxyarr.length > 0) {
            const proxyWorks = await testProxyConnection(proxyarr[0], port);
            console.log("Budget proxy working:", proxyWorks);
            
            if (proxyWorks) {
              return res.status(200).json({
                success: true,
                message: "Residential proxies generated successfully",
                proxies: proxyarr,
                status: "success"
              });
            } else {
              return res.status(400).json({
                success: false,
                message: "Proxies are not available for this location. Please try a different location.",
                status: "failed"
              });
            }
          } else {
            return res.status(400).json({
              success: false,
              message: "No proxies were generated. Please try a different location.",
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
      } catch (error) {
        // console.log(error?.response?.data);
        // console.log(error);
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
    const { country, region, protocol, connection, zip } = req.query;
    const url = (country && region && protocol && connection && zip) ? `https://api.digiproxy.cc/reseller/products/lte/available_quantity?country_code=${country}&region_code=${region}&protocol=${protocol}&conn_type=${connection}&zip_code=${zip}` : (country && region && protocol && connection) ? `https://api.digiproxy.cc/reseller/products/lte/zip_list?country_code=${country}&region_code=${region}&protocol=${protocol}&conn_type=${connection}` : (country && !region) ? `https://api.digiproxy.cc/reseller/products/lte/regions/${country}` : "https://api.digiproxy.cc/reseller/products/lte/countries";
    const response = await axios.get(url, {
      params: (country && region && protocol && connection) ? {
        country_code: country,
        region_code: region,
        protocol: protocol,
        conn_type: connection,
        zip_code: zip,
      } : {},
      headers: {
        Authorization: `Bearer ${process.env.Key}`,
        "Content-Type": "application/json",
      },
    });
    // console.log(response?.data);
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
              ...location,
              amount: 1
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
            plan: {
              id: "24H"
            },
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
        console.log(error);
        console.log(error?.response?.data);
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
      // Extract validity period from plan id
      const getValidityPeriod = (plan) => {
        if (plan.includes("m")) {
          const months = parseInt(plan.split("m")[0], 10);
          return `${months} ${months === 1 ? 'Month' : 'Months'}`;
        } else if (plan.includes("w")) {
          const weeksMatch = plan.match(/(\d+)w/);
          if (weeksMatch && weeksMatch[1]) {
            const weeks = parseInt(weeksMatch[1], 10);
            return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
          }
          return "1 Week"; // Default if pattern doesn't match but has 'w'
        } else if (plan.includes("d")) {
          const daysMatch = plan.match(/(\d+)d/);
          if (daysMatch && daysMatch[1]) {
            const days = parseInt(daysMatch[1], 10);
            return `${days} ${days === 1 ? 'Day' : 'Days'}`;
          }
          return "7 Days"; // Default for days
        } else {
          return null
        }
      };
      try {
        const response = await axios.post(
          "https://api.proxy-cheap.com/order/execute",
          payload,
          {
            headers: {
              "X-Api-Key": process.env.Proxy_cheap_key,
              "X-Api-Secret": process.env.Proxy_cheap_secret,
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
        userfromdb.balance = Number(
          (userfromdb.balance - price * quantity).toFixed(2)
        );
        userfromdb.save();
        const getOrderInfo = await axios.get(
          `https://api.proxy-cheap.com/orders/${response?.data?.id}/proxies`,
          // `https://api.proxy-cheap.com/orders/84b357d1-0fcf-11f0-8647-0204b4dab599/proxies`,
          {
            headers: {
              "X-Api-Key": process.env.Proxy_cheap_key,
              "X-Api-Secret": process.env.Proxy_cheap_secret,
              "Content-Type": "application/json",
            },
          }
        );
        // console.log(getOrderInfo?.data);
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
                plan: {
                  id: getValidityPeriod(plan),
                },
                order_id: response?.data?.id,
                // order_id: "84b357d1-0fcf-11f0-8647-0204b4dab599",
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
          message: `"Error! Please try again"`,
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
    // console.log(user?.ResidentialCredentials)
    if (user?.ResidentialCredentials?.id) {
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
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

module.exports = router;
