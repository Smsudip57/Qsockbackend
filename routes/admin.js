const express = require("express");
const User = require("../models/user");
const router = express.Router();
const axios = require("axios");
const Plan = require("../models/plans");
const Transaction = require("../models/transactions");
const History = require("../models/proxyhistory");
const bcrypt = require("bcrypt");
const Coupon = require("../models/coupons");

router.get("/plan_info", async (req, res) => {
  try {
    const { type } = req.query;
    if (
      ![
        "Static Residential Proxies",
        "Budget Residential Proxies",
        "Datacenter Proxies",
        "Datacenter IPv6 Proxies",
        "Premium Residential Proxies",
      ].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type",
      });
    }
    const response = await axios.get(
      "https://api.digiproxy.cc/reseller/products/all",
      {
        headers: {
          Authorization: `Bearer ${process.env.Key}`,
          "Content-Type": "application/json",
        },
      }
    );
    const response_data = response?.data;
    if (
      [
        "Static Residential Proxies",
        "Datacenter Proxies",
        "Datacenter IPv6 Proxies",
      ].includes(type)
    ) {
      const plan = response_data.find((plan) => plan.name === type);
      const plans = plan?.plans.map((plan) => {
        return {
          id: plan.id,
          name: plan.name,
          price: parseFloat(parseInt(plan?.price?.final)),
        };
      });
      plan.plans = plans;
      return res.status(200).json({
        success: true,
        plan,
      });
    } else if (
      ["Premium Residential Proxies", "Budget Residential Proxies"].includes(
        type
      )
    ) {
      const plan = response_data.find((plan) => plan.name === type);
      const plans = [
        {
          price: parseFloat(parseInt(plan?.price?.final)),
        },
      ];
      plan.plans = plans;
      return res.status(200).json({
        success: true,
        plan,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.post("/create_plan", async (req, res) => {
  try {
    const { name, price, type, id, note, tag, amount } = req.body;
    if (!name || !price || !note || !tag) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    if (
      !type ||
      ![
        "Static Residential Proxies",
        "Budget Residential Proxies",
        "Datacenter Proxies",
        "Datacenter IPv6 Proxies",
        "Premium Residential Proxies",
        "LTE Mobile Proxies",
      ].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Plan type is required",
      });
    }

    const response = await axios.get(
      "https://api.digiproxy.cc/reseller/products/all",
      {
        headers: {
          Authorization: `Bearer ${process.env.Key}`,
          "Content-Type": "application/json",
        },
      }
    );
    const plan = response?.data?.find((plan) => plan.name === type);

    if (
      [
        "Static Residential Proxies",
        "Datacenter Proxies",
        "Datacenter IPv6 Proxies",
      ].includes(type)
    ) {
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Plan id is required",
        });
      }
      const productexist = await Plan.findOne({
        productId: plan.id,
      });
      if (productexist) {
        const existingPlanIndex = productexist.plans.findIndex(
          (p) => p.id === id
        );

        if (existingPlanIndex !== -1) {
          productexist.plans[existingPlanIndex] = {
            ...productexist.plans[existingPlanIndex].toObject(),
            name: name,
            price: price,
            note: note,
            tag: tag,
          };
        } else {
          productexist.plans.push({
            name: name,
            price: price,
            id: id,
            note: note,
            tag: tag,
          });
        }
        await productexist.save();
        return res.status(200).json({
          success: true,
          message: "Plan updated successfully",
        });
      } else {
        const newplan = new Plan({
          productId: plan.id,
          name: type,
          plans: [
            {
              name: name,
              price: price,
              id: id,
              note: note,
              tag: tag,
            },
          ],
        });
        await newplan.save();
        return res.status(200).json({
          success: true,
          message: "Plan created successfully",
        });
      }
    } else if (
      ["Premium Residential Proxies", "Budget Residential Proxies"].includes(
        type
      )
    ) {
      if (!amount) {
        return res.status(400).json({
          success: false,
          message: "Amount is required",
        });
      }
      const productexist = await Plan.findOne({
        productId: plan.id,
      });
      console.log(productexist);
      if (productexist) {
        const existingPlanIndex = productexist.plans.findIndex(
          (p) => p?.amount === amount
        );

        if (existingPlanIndex !== -1) {
          productexist.plans[existingPlanIndex] = {
            ...productexist.plans[existingPlanIndex].toObject(),
            name: name,
            price: price,
            note: note,
            tag: tag,
            amount: amount,
          };
        } else {
          productexist.plans.push({
            name: name,
            price: price,
            note: note,
            tag: tag,
            amount: amount,
            id: `${productexist.plans.length + 1}`,
          });
        }
        await productexist.save();
        return res.status(200).json({
          success: true,
          message: "Plan updated successfully",
        });
      } else {
        const newplan = new Plan({
          productId: plan.id,
          name: type,
          plans: [
            {
              name: name,
              price: price,
              amount: amount,
              note: note,
              tag: tag,
            },
          ],
        });
        await newplan.save();
        return res.status(200).json({
          success: true,
          message: "Plan created successfully",
        });
      }
    } else {
      const existingPlan = await Plan.findOne({
        productId: plan.id,
      });
      if (existingPlan) {
        existingPlan.plans[0] = {
          ...existingPlan.plans[0].toObject(),
          name: name,
          price: price,
          note: note,
          tag: tag,
        };
        existingPlan.save();
      } else {
        const newplan = new Plan({
          productId: plan.id,
          name: type,
          plans: [
            {
              name: name,
              price: price,
              note: note,
              tag: tag,
              id: "1",
            },
          ],
        });
        await newplan.save();
        return res.status(200).json({
          success: true,
          message: "Plan created successfully",
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Something went wrong.`,
    });
  }
});



router.get("/plan-details", async (req, res) => {
  try {
    const { type } = req.query;

    if (!type || ![
      "Static Residential Proxies",
      "Budget Residential Proxies",
      "Datacenter Proxies",
      "Datacenter IPv6 Proxies",
      "Premium Residential Proxies",
      "LTE Mobile Proxies",
    ].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan type is required"
      });
    }

    const response = await axios.get(
      "https://api.digiproxy.cc/reseller/products/all",
      {
        headers: {
          Authorization: `Bearer ${process.env.Key}`,
          "Content-Type": "application/json",
        },
      }
    );
    let apitype = type;
    if (type === "Datacenter IPv6 Proxies") {
      apitype = "Datacenter Proxies IPv6";
    } else if (type === "Datacenter Proxies") {
      apitype = "Datacenter Proxies IPv4";
    }
    const providerPlan = response?.data?.find(plan => plan.name === apitype);
    console.log(providerPlan);
    if (!providerPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan type not found in provider data"
      });
    }

    // Find our local plan data if it exists
    const localPlan = await Plan.findOne({
      productId: providerPlan.id
    });

    let result = {
      productId: providerPlan.id,
      type: type,
      providerDetails: {},
      customPlans: []
    };

    // Handle different plan types differently
    if ([

      "Datacenter Proxies",
      "Datacenter IPv6 Proxies"
    ].includes(type)) {
      result.providerDetails = {
        idRequired: true,
        amountRequired: false,
        availableIds: providerPlan.plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          providerPrice: parseFloat(plan.price?.final || 0)
        }))
      };
    }
    else if ([
      "Static Residential Proxies",
    ].includes(type)) {
      try {
        const response = await axios.post(
          'https://api.proxy-cheap.com/order/configuration',
          {
            networkType: "RESIDENTIAL_STATIC"
          },
          {
            headers: {
              "accept": "application/json",
              "Content-Type": "application/json",
              "X-Api-Key": process.env.Proxy_cheap_key,
              "X-Api-Secret": process.env.Proxy_cheap_secret
            }
          }
        );
        // Extract supported time periods
        const supportedMonths = response?.data?.supportedMonths;
        const supportedDays = response?.data?.supportedDays?.choices;
        const ids = [];
        const availableIds = [];

        // Process days that can be converted to weeks (divisible by 7)
        if (supportedDays && supportedDays.length > 0) {
          supportedDays.forEach((day) => {
            const even = day % 7 === 0;
            console.log(day / 7);
            if (even) {
              const id = `${day / 7}w`;
              const weeks = day / 7;
              ids.push(id);
              availableIds.push({
                id: id,
                name: `${weeks} Week${weeks > 1 ? 's' : ''}`,
                providerPrice: parseFloat(response?.data?.prices?.find(p => p.days === day)?.amount || 0),
                days: day
              });
            }
          });
        }

        // Process months
        const monthArray = Array.from(
          { length: supportedMonths.max - supportedMonths.min + 1 },
          (_, i) => i + supportedMonths.min
        );

        if (monthArray && monthArray.length > 0) {
          monthArray.forEach((month) => {
            const id = `${month}m`;
            ids.push(id);
            availableIds.push({
              id: id,
              name: `${month} Month${month > 1 ? 's' : ''}`,
              providerPrice: parseFloat(response?.data?.prices?.find(p => p.months === month)?.amount || 0),
              months: month
            });
          });
        }

        result.providerDetails = {
          idRequired: true,
          amountRequired: false,
          availableIds: availableIds,
          idFormat: "Duration-based (e.g., '4w' for 4 weeks, '2m' for 2 months)",
          baseConfig: {
            networkType: "RESIDENTIAL_STATIC",
            protocols: response?.data?.supportedProtocols || ["SOCKS5"],
            countries: response?.data?.supportedCountries || ["US"],
            ipVersions: response?.data?.supportedIpVersions || ["IPv4"]
          }
        };

        // Log success
        console.log(`Successfully fetched ${availableIds.length} plan options for Static Residential Proxies`);

      } catch (error) {
        console.error("Error fetching Static Residential Proxies plan details:", error);
        return res.status(500).json({
          success: false,
          message: "Error fetching Static Residential Proxies plan details"
        });
      }
    }
    else if ([
      "Premium Residential Proxies",
      "Budget Residential Proxies"
    ].includes(type)) {
      // These plans use amounts for differentiation
      result.providerDetails = {
        idRequired: false,
        amountRequired: true,
        basePrice: parseFloat(providerPlan.price?.final || 0),
        suggestedAmounts: [1, 5, 10, 25, 50, 100]
      };
    }
    else {
      result.providerDetails = {
        idRequired: false,
        amountRequired: false,
        basePrice: parseFloat(providerPlan.price?.final || 0)
      };
    }

    if (localPlan) {
      result.customPlans = localPlan.plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        tag: plan.tag,
        note: plan.note,
        amount: plan.amount
      }));
    }

    return res.status(200).json({
      success: true,
      plan: result
    });
  } catch (error) {
    console.error("Error fetching plan details:", error?.response?.data || error);
    return res.status(500).json({
      success: false,
      message: "Error fetching plan details"
    });
  }
});


router.delete("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required"
      });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }

    await Plan.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Plan deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting plan"
    });
  }
});


router.delete("/plans/:id/subplan/:subplanId", async (req, res) => {
  try {
    const { id, subplanId } = req.params;

    if (!id || !subplanId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID and subplan ID are required"
      });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }

    // Find the index of the subplan
    const subplanIndex = plan.plans.findIndex(
      subplan => subplan._id.toString() === subplanId
    );

    if (subplanIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Plan option not found"
      });
    }

    // Remove the subplan
    plan.plans.splice(subplanIndex, 1);

    // If this was the last subplan, delete the entire plan
    if (plan.plans.length === 0) {
      await Plan.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: "Last plan option removed, plan deleted"
      });
    }

    // Otherwise save the updated plan
    await plan.save();

    return res.status(200).json({
      success: true,
      message: "Plan option deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting plan option:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting plan option"
    });
  }
});

//admin main enpoints--

//Dashboard stats endpoint
router.get("/dashboard-stats", async (req, res) => {
  try {
    // Get period parameter (default to 7days)
    const period = req.query.period || '7days';

    // Calculate date ranges based on period
    const currentPeriod = getDateRangeFromPeriod(period);
    const previousPeriod = getPreviousPeriodRange(currentPeriod.startDate, currentPeriod.endDate);

    // Get total users (current)
    const totalUsers = await User.countDocuments({ isActive: true });

    // Get total users (previous period)
    const previousTotalUsers = await User.countDocuments({
      isActive: true,
      createdAt: { $lt: previousPeriod.endDate }
    });

    // Calculate total revenue (current period)
    const currentTransactions = await Transaction.find({

    });
    const totalRevenue = currentTransactions.reduce((sum, transaction) => sum + transaction.Amount, 0);

    // Calculate total revenue (previous period)
    const previousTransactions = await Transaction.find({
      createdAt: { $gte: previousPeriod.startDate, $lte: previousPeriod.endDate }
    });
    const previousTotalRevenue = previousTransactions.reduce((sum, transaction) => sum + transaction.Amount, 0);

    // Get active proxies (count all proxies as there's no endDate field)
    const activeProxies = await History.countDocuments();

    // Get today's info
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysTransactions = await Transaction.find({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    const todaysSales = todaysTransactions.reduce((sum, transaction) => sum + transaction.Amount, 0);

    // Get today's new users
    const todaysUsers = await User.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    // Get yesterday's info for comparison
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const yesterdaysTransactions = await Transaction.find({
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });
    const yesterdaysSales = yesterdaysTransactions.reduce((sum, transaction) => sum + transaction.Amount, 0);

    // Get yesterday's new users
    const yesterdaysUsers = await User.countDocuments({
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });

    // Get monthly profit
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date();

    const monthlyTransactions = await Transaction.find({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    const monthlyProfit = monthlyTransactions.reduce((sum, transaction) => sum + transaction.Amount, 0);

    // Get previous month's profit
    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    const prevMonthEnd = new Date(monthStart);
    prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);
    prevMonthEnd.setHours(23, 59, 59, 999);

    const prevMonthlyTransactions = await Transaction.find({
      createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd }
    });
    const prevMonthlyProfit = prevMonthlyTransactions.reduce((sum, transaction) => sum + transaction.Amount, 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalRevenue,
        activeProxies,
        todaysSales,
        todaysUsers,
        monthlyProfit
      },
      previousPeriod: {
        totalUsers: previousTotalUsers,
        totalRevenue: previousTotalRevenue,
        monthlyProfit: prevMonthlyProfit,
        todaysSales: yesterdaysSales,
        todaysUsers: yesterdaysUsers
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics"
    });
  }
});


// Chart data endpoint - specific to visualization
router.get("/chart-data", async (req, res) => {
  try {
    const period = req.query.period || '7days';

    // Generate sales data according to selected period
    const salesData = await generateSalesChartData(period);

    return res.status(200).json({
      success: true,
      salesData
    });
  } catch (error) {
    console.error("Error generating chart data:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating sales chart data"
    });
  }
});

// Recent activity endpoint
router.get("/recent-activity", async (req, res) => {
  try {
    const activities = await getRecentActivity();

    return res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching recent activity"
    });
  }
});
// Helper function to get date range based on period
function getDateRangeFromPeriod(period) {
  const endDate = new Date();
  let startDate = new Date();

  switch (period) {
    case '7days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30days':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'month':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 7);
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

// Helper function to get previous period range
function getPreviousPeriodRange(startDate, endDate) {
  const duration = endDate - startDate;
  const previousEndDate = new Date(startDate);
  previousEndDate.setMilliseconds(previousEndDate.getMilliseconds() - 1);
  const previousStartDate = new Date(previousEndDate - duration);

  return { startDate: previousStartDate, endDate: previousEndDate };
}

// Enhanced helper function to generate sales chart data based on period
async function generateSalesChartData(period) {
  const salesData = [];
  const { startDate, endDate } = getDateRangeFromPeriod(period);

  // Calculate number of points to show based on period
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const step = period === '30days' ? 3 : 1; // For 30 days, we'll group by 3 days

  for (let i = 0; i < totalDays; i += step) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + step);
    if (nextDate > endDate) {
      nextDate.setTime(endDate.getTime());
    }

    // Get sales for this period - use Amount with capital A
    const periodTransactions = await Transaction.find({
      createdAt: { $gte: date, $lt: nextDate }
    });

    const periodSales = periodTransactions.reduce((sum, transaction) =>
      sum + transaction.Amount, 0);

    // Get new users for this period
    const periodUsers = await User.countDocuments({
      createdAt: { $gte: date, $lt: nextDate }
    });

    // Format the date based on period
    let formattedDate;
    if (period === '30days' && step > 1) {
      const endRangeDate = new Date(date);
      endRangeDate.setDate(date.getDate() + step - 1);
      formattedDate = `${date.getDate()}-${endRangeDate.getDate() > endDate.getDate() ? endDate.getDate() : endRangeDate.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
    } else {
      formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    salesData.push({
      date: formattedDate,
      sales: periodSales,
      users: periodUsers
    });
  }

  return salesData;
}

// Helper function to get recent activity - adjusted for actual schemas
async function getRecentActivity() {
  try {
    // Get last 5 transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Get last 5 proxy creations
    const recentProxies = await History.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'email name');

    // Process transactions - since there's no user field, use OrderID
    const transactionActivities = recentTransactions.map(t => ({
      user: `Order #${t.OrderID.substring(0, 8)}`,
      action: t?.method,
      time: new Date(t.createdAt).toLocaleString(),
      amount: t.Amount,
      proxyType: null
    }));

    // Process proxies
    const proxyActivities = recentProxies.map(p => ({
      user: p.user?.email || p.user?.name || 'Anonymous',
      action: 'created proxy',
      time: new Date(p.createdAt).toLocaleString(),
      amount: null,
      proxyType: p.type
    }));

    // Combine and sort
    const allActivities = [...transactionActivities, ...proxyActivities]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10);

    return allActivities;
  } catch (error) {
    console.error("Error getting recent activity:", error);
    return [];
  }
}


router.get("/users", async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      role,
      status,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (status && status !== 'all') filter.status = status;

    // Add search functionality
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Count total matching users for pagination
    const totalUsers = await User.countDocuments(filter);

    // Execute query with sort and pagination
    const users = await User.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Enhance user data with spending info
    const usersWithSpending = await Promise.all(users.map(async (user) => {
      // Calculate total spent
      const transactions = await Transaction.find({ user: user._id });
      const totalSpent = transactions.reduce((sum, tx) => sum + tx.Amount, 0);

      return {
        ...user.toObject(),
        totalSpent
      };
    }));

    return res.status(200).json({
      success: true,
      users: usersWithSpending,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users"
    });
  }
});


router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user's transactions
    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });
    const totalSpent = transactions.reduce((sum, tx) => sum + tx.Amount, 0);

    // Get user's proxies
    const proxies = await History.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        totalSpent,
        proxiesCount: proxies.length
      },
      transactions,
      proxies
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user details"
    });
  }
});


router.post("/users/bulk-add-balance", async (req, res) => {
  try {
    const { userIds, amount, note } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required"
      });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required"
      });
    }
    if (!note || (note !== "add" && note !== "add_without_record" && note !== "deduct")) {
      return res.status(400).json({
        success: false,
        message: "Valid note parameter is required: 'add', 'add_without_record', or 'deduct'"
      });
    }
    const results = {
      successful: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);

        if (!user) {
          results.failed.push({ userId, reason: "User not found" });
          continue;
        }

        let transaction = null;
        if (note.includes("add")) {
          user.balance += parseFloat(amount);
          if (note !== "add_without_record") {

            transaction = new Transaction({
              OrderID: `BULK-${Date.now()}-${userId}`,
              Amount: parseFloat(amount),
              method: "Admin Credit",
              user: userId,
              note: "Balance added by admin"
            });
            await transaction.save();
          }
        } else if (note === "deduct") {
          user.balance -= parseFloat(amount);
        }
        await user.save();

        results.successful.push({
          userId,
          email: user.email,
          newBalance: user.balance
        });
      } catch (error) {
        results.failed.push({ userId, reason: "Processing error" });
      }
    }



    return res.status(200).json({
      success: true,
      message: note.includes("add") ? `Balance added to ${results.successful.length} users` : `Balance deducted ${results.successful.length} users`,
      results
    });
  } catch (error) {
    console.error("Error in bulk add balance:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing bulk add balance request"
    });
  }
});

router.post("/users/batch", async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required"
      });
    }

    const users = await User.find({ _id: { $in: userIds } });

    // Enhance user data with spending info
    const usersWithSpending = await Promise.all(users.map(async (user) => {
      // Calculate total spent
      const transactions = await Transaction.find({ user: user._id });
      const totalSpent = transactions.reduce((sum, tx) => sum + tx.Amount, 0);

      return {
        ...user.toObject(),
        totalSpent
      };
    }));

    return res.status(200).json({
      success: true,
      users: usersWithSpending
    });
  } catch (error) {
    console.error("Error fetching users by batch:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users"
    });
  }
});


router.post("/users", async (req, res) => {
  try {
    const { email, password, name, role, initialBalance, status } = req.body;

    // Validate required fields
    const errors = {};
    if (!email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Email is invalid";

    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
        errors: { email: "Email is already registered" }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set user status
    let isActive = true;
    if (status === 'inactive') isActive = false;

    // Create the user
    const newUser = new User({
      email,
      password: hashedPassword,
      role: role || "user",
      profile: {
        name: name || email.split("@")[0]
      },
      balance: initialBalance ? Number(initialBalance) : 0,
      isActive,
      isSuspended: status === 'suspended',
      createdAt: new Date()
    });

    await newUser.save();

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    // If initial balance was added, record it as a transaction
    if (initialBalance && Number(initialBalance) > 0) {
      const transaction = new Transaction({
        OrderID: `INITIAL-${Date.now()}`,
        Amount: Number(initialBalance),
        method: "Initial Balance",
        user: newUser._id,
        note: "Initial balance on account creation"
      });
      await transaction.save();
    }

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating user"
    });
  }
});

router.post("/users/:userId/add-balance", async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, note } = req.body;
    // add_without_record deduct
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let msg
    let transaction = null;
    if (note.includes("add")) {
      user.balance += parseFloat(amount);
      msg = `$${amount} added to user balance successfully`
      if (note !== "add_without_record") {

        transaction = new Transaction({
          OrderID: `ADMIN-${Date.now()}`,
          Amount: parseFloat(amount),
          method: "Admin Credit",
          user: userId,
          note: "Balance added by admin"
        });
        await transaction.save();
        msg = `$${amount} added to user balance successfully and recorded`
      }
    } else if (note === "deduct") {
      user.balance -= parseFloat(amount);
      msg = `$${amount} deducted from user balance successfully`
    }
    await user.save();


    return res.status(200).json({
      success: true,
      message: msg,
      user,
      transaction
    });
  } catch (error) {
    console.error("Error adding balance:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding balance"
    });
  }
});


router.get("/users/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long"
      });
    }

    // Build search filter
    const filter = {
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    };

    // Find matching users (limit to reasonable amount)
    const users = await User.find(filter).limit(25);

    // Enhance user data with spending info
    const usersWithSpending = await Promise.all(users.map(async (user) => {
      // Calculate total spent
      const transactions = await Transaction.find({ user: user._id });
      const totalSpent = transactions.reduce((sum, tx) => sum + tx.Amount, 0);

      return {
        ...user.toObject(),
        totalSpent
      };
    }));

    return res.status(200).json({
      success: true,
      users: usersWithSpending
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching users"
    });
  }
});


router.delete("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user first to check if exists
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Delete user's transactions
    await Transaction.deleteMany({ user: userId });

    // Delete user's proxies
    await History.deleteMany({ user: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: "User and all associated data deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting user"
    });
  }
});


router.patch("/users/:userId/ban", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update user status
    user.isSuspended = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User banned successfully",
      user
    });
  } catch (error) {
    console.error("Error banning user:", error);
    return res.status(500).json({
      success: false,
      message: "Error banning user"
    });
  }
});

router.patch("/users/:userId/unban", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update user status
    user.isSuspended = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User unbanned successfully",
      user
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    return res.status(500).json({
      success: false,
      message: "Error unbanning user"
    });
  }
});


router.get("/sales-dashboard", async (req, res) => {
  try {
    // Get query parameters for filtering
    const {
      dateFilter = 'all',   // 'today', 'month', 'all'
      searchTerm = '',      // search by OrderID
      paymentMethod = 'all' // filter by payment method
    } = req.query;

    // Define date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Build filter for transactions
    const transactionFilter = {};

    // Apply date filter
    if (dateFilter === 'today') {
      transactionFilter.createdAt = { $gte: todayStart };
    } else if (dateFilter === 'month') {
      transactionFilter.createdAt = { $gte: monthStart };
    }

    // Apply payment method filter
    if (paymentMethod !== 'all') {
      transactionFilter.method = paymentMethod;
    }

    // Apply search filter if provided
    if (searchTerm) {
      transactionFilter.OrderID = { $regex: searchTerm, $options: 'i' };
    }

    // OPTIMIZATION 1: Fetch filtered transactions in one query with projection
    const transactions = await Transaction.find(transactionFilter)
      .select('OrderID Amount method createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // OPTIMIZATION 2: Run parallel queries for stats data
    const [todayStats, yesterdayStats, monthStats, lastMonthStats, paymentMethodStats] = await Promise.all([
      // Today's stats
      Transaction.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$Amount" },
            count: { $sum: 1 }
          }
        }
      ]),

      // Yesterday's stats
      Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: yesterdayStart,
              $lt: todayStart
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$Amount" },
            count: { $sum: 1 }
          }
        }
      ]),

      // This month's stats
      Transaction.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$Amount" },
            count: { $sum: 1 }
          }
        }
      ]),

      // Last month's stats
      Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: lastMonthStart,
              $lte: lastMonthEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$Amount" },
            count: { $sum: 1 }
          }
        }
      ]),

      // OPTIMIZATION 3: Get payment methods breakdown in one query
      Transaction.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$method", "Other"] },
            totalAmount: { $sum: "$Amount" }
          }
        },
        {
          $project: {
            _id: 0,
            method: "$_id",
            amount: "$totalAmount"
          }
        }
      ])
    ]);

    // OPTIMIZATION 4: Get daily and monthly chart data in single aggregation queries
    const [dailySalesChartData, monthlySalesChartData] = await Promise.all([
      getDailySalesDataOptimized(),
      getMonthlySalesDataOptimized()
    ]);

    // Extract stats values (handle empty results with default values)
    const todaySales = todayStats[0]?.totalSales || 0;
    const todayCount = todayStats[0]?.count || 0;
    const yesterdaySales = yesterdayStats[0]?.totalSales || 0;
    const monthSales = monthStats[0]?.totalSales || 0;
    const monthCount = monthStats[0]?.count || 0;
    const lastMonthSales = lastMonthStats[0]?.totalSales || 0;

    // Get total stats (using another aggregation for accuracy)
    const allTimeStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$Amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const allTimeSales = allTimeStats[0]?.totalSales || 0;
    const allTimeCount = allTimeStats[0]?.count || 0;

    // Calculate percent changes
    const todayPercentChange = yesterdaySales === 0 ? 100 : ((todaySales - yesterdaySales) / yesterdaySales) * 100;
    const monthPercentChange = lastMonthSales === 0 ? 100 : ((monthSales - lastMonthSales) / lastMonthSales) * 100;

    // Format payment methods data
    const paymentMethodChartData = {
      labels: paymentMethodStats.map(item => item.method),
      data: paymentMethodStats.map(item => item.amount)
    };

    // Prepare stats object
    const stats = {
      today: {
        totalSales: todaySales,
        transactions: todayCount,
        percentChange: Math.abs(todayPercentChange).toFixed(1),
        isPositive: todayPercentChange >= 0
      },
      month: {
        totalSales: monthSales,
        transactions: monthCount,
        percentChange: Math.abs(monthPercentChange).toFixed(1),
        isPositive: monthPercentChange >= 0
      },
      allTime: {
        totalSales: allTimeSales,
        transactions: allTimeCount,
        averageOrder: allTimeCount > 0 ? allTimeSales / allTimeCount : 0
      }
    };

    return res.status(200).json({
      success: true,
      transactions,
      stats,
      chartData: {
        dailySales: dailySalesChartData,
        monthlySales: monthlySalesChartData,
        paymentMethods: paymentMethodChartData
      }
    });
  } catch (error) {
    console.error("Error fetching sales dashboard data:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching sales dashboard data"
    });
  }
});

async function getDailySalesDataOptimized() {
  const last7Days = [];
  const dailyData = [];

  // Get today and 6 days ago date for query
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  // Prepare labels (these don't need to come from the database)
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    last7Days.push(dateString);
    // Initialize with zeros (will be filled if data exists)
    dailyData.push(0);
  }

  // Single aggregate query to get daily sales totals
  const dailySalesResults = await Transaction.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: today } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        dailySales: { $sum: "$Amount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Map results to the correct days in our array
  dailySalesResults.forEach(day => {
    const date = new Date(day._id);
    const daysAgo = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysAgo >= 0 && daysAgo < 7) {
      // Insert at the right position (6-daysAgo because our array is reversed)
      dailyData[6 - daysAgo] = day.dailySales;
    }
  });

  return {
    labels: last7Days,
    data: dailyData
  };
}

async function getMonthlySalesDataOptimized() {
  const last6Months = [];
  const monthlyData = [];

  // Get current date for calculation
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Prepare date 6 months ago for query boundary
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // Prepare labels and initialize data array
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const monthString = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    last6Months.push(monthString);
    // Initialize with zeros (will be filled if data exists)
    monthlyData.push(0);
  }

  // Get monthly sales with a single aggregation query
  const monthlySalesResults = await Transaction.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        monthlySales: { $sum: "$Amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Map results to the right position in our array
  monthlySalesResults.forEach(monthData => {
    const monthIndex = (currentMonth + 12 - monthData._id.month) % 12;
    const yearDiff = currentYear - monthData._id.year;

    // Only include data from the last 6 months
    if (monthIndex < 6 && yearDiff <= 1) {
      // The position in our array (5-monthIndex because our array is in reverse order)
      monthlyData[5 - monthIndex] = monthData.monthlySales;
    }
  });

  return {
    labels: last6Months,
    data: monthlyData
  };
}


//coupons endpoint

router.get("/coupons", async (req, res) => {
  try {
    // Extract query parameters
    const { status, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    // Execute query with sort
    const coupons = await Coupon.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });

    // Check if any coupons have expired
    const now = new Date();
    const updatedCoupons = [];

    for (const coupon of coupons) {
      // Automatically update status if expired
      if (coupon.status === 'active' && coupon.expiresAt < now) {
        coupon.status = 'expired';
        await coupon.save();
      }
      updatedCoupons.push(coupon);
    }

    return res.status(200).json({
      success: true,
      coupons: updatedCoupons
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching coupons"
    });
  }
});


router.get("/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    // Check if expired and update status if needed
    const now = new Date();
    if (coupon.status === 'active' && coupon.expiresAt < now) {
      coupon.status = 'expired';
      await coupon.save();
    }

    return res.status(200).json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching coupon"
    });
  }
});


router.post("/coupons", async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountAmount,
      maxUsage,
      expiresAt,
      status,
      allowedProducts,
      minimumPurchase
    } = req.body;

    // Validate required fields
    if (!code || !description || !discountType || discountAmount === undefined || !maxUsage || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing"
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists"
      });
    }

    // Validate discount amount based on discount type
    if (discountType === 'percentage' && (discountAmount < 1 || discountAmount > 100)) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount must be between 1 and 100"
      });
    } else if (discountType === 'fixed' && discountAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fixed discount must be greater than 0"
      });
    }

    const newCoupon = new Coupon({
      code,
      description,
      discountType,
      discountAmount,
      maxUsage,
      expiresAt,
      status: status || 'active',
      allowedProducts: allowedProducts || [],
      minimumPurchase: minimumPurchase || 0
    });

    await newCoupon.save();

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon: newCoupon
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating coupon",
      error: error.message
    });
  }
});


router.put("/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discountAmount,
      maxUsage,
      expiresAt,
      status,
      allowedProducts,
      minimumPurchase
    } = req.body;

    // Find the coupon
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    // If code is changed, check if it already exists
    if (code && code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
      if (existingCoupon && existingCoupon._id.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists"
        });
      }
      coupon.code = code;
    }

    // Validate discount amount based on discount type if both are provided
    if (discountType && discountAmount !== undefined) {
      if (discountType === 'percentage' && (discountAmount < 1 || discountAmount > 100)) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount must be between 1 and 100"
        });
      } else if (discountType === 'fixed' && discountAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Fixed discount must be greater than 0"
        });
      }
    } else if (discountType && !discountAmount && discountType !== coupon.discountType) {
      // If only discount type changed, validate the existing amount with the new type
      if (discountType === 'percentage' && (coupon.discountAmount < 1 || coupon.discountAmount > 100)) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount must be between 1 and 100"
        });
      } else if (discountType === 'fixed' && coupon.discountAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Fixed discount must be greater than 0"
        });
      }
    }

    // Update fields if provided
    if (description !== undefined) coupon.description = description;
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountAmount !== undefined) coupon.discountAmount = discountAmount;
    if (maxUsage !== undefined) coupon.maxUsage = maxUsage;
    if (expiresAt !== undefined) coupon.expiresAt = expiresAt;
    if (status !== undefined) coupon.status = status;
    if (allowedProducts !== undefined) coupon.allowedProducts = allowedProducts;
    if (minimumPurchase !== undefined) coupon.minimumPurchase = minimumPurchase;

    // Update the updated timestamp
    coupon.updatedAt = new Date();

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating coupon",
      error: error.message
    });
  }
});


router.delete("/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    await Coupon.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting coupon"
    });
  }
});


router.patch("/coupons/:id/toggle-status", async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    // Toggle between active and disabled
    if (coupon.status === 'active') {
      coupon.status = 'disabled';
    } else if (coupon.status === 'disabled') {
      coupon.status = 'active';
    } else if (coupon.status === 'expired' && coupon.expiresAt > new Date()) {
      // Only allow reactivating if it hasn't actually expired
      coupon.status = 'active';
    } else {
      return res.status(400).json({
        success: false,
        message: "Cannot change status of expired coupon"
      });
    }

    coupon.updatedAt = new Date();
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon ${coupon.status === 'active' ? 'enabled' : 'disabled'} successfully`,
      coupon
    });
  } catch (error) {
    console.error("Error toggling coupon status:", error);
    return res.status(500).json({
      success: false,
      message: "Error toggling coupon status"
    });
  }
});


router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, productIds = [], amount = 0 } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required"
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code"
      });
    }

    // Check if coupon is active
    if (coupon.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: coupon.status === 'expired' ?
          "This coupon has expired" :
          "This coupon is not active"
      });
    }

    // Check if coupon is expired
    if (coupon.expiresAt < new Date()) {
      coupon.status = 'expired';
      await coupon.save();
      return res.status(400).json({
        success: false,
        message: "This coupon has expired"
      });
    }

    // Check usage limit
    if (coupon.usageCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit"
      });
    }

    // Check minimum purchase
    if (amount < coupon.minimumPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount is $${coupon.minimumPurchase}`
      });
    }

    // Check product restrictions
    if (coupon.allowedProducts && coupon.allowedProducts.length > 0) {
      const hasValidProduct = productIds.some(id =>
        coupon.allowedProducts.includes(id)
      );

      if (!hasValidProduct) {
        return res.status(400).json({
          success: false,
          message: "This coupon is not valid for selected products"
        });
      }
    }

    // Calculate discount
    const discount = coupon.discountType === 'percentage' ?
      (amount * coupon.discountAmount / 100) :
      Math.min(coupon.discountAmount, amount);

    return res.status(200).json({
      success: true,
      message: "Coupon is valid",
      coupon: {
        ...coupon.toObject(),
        discount: parseFloat(discount.toFixed(2))
      }
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error validating coupon"
    });
  }
});

router.get("/coupons/stats/summary", async (req, res) => {
  try {
    // Get total coupons
    const totalCoupons = await Coupon.countDocuments();

    // Get active coupons
    const activeCoupons = await Coupon.countDocuments({ status: 'active' });

    // Get highest discount
    const highestPercentageCoupon = await Coupon.findOne({ discountType: 'percentage' })
      .sort({ discountAmount: -1 })
      .limit(1);

    const highestFixedCoupon = await Coupon.findOne({ discountType: 'fixed' })
      .sort({ discountAmount: -1 })
      .limit(1);

    // Calculate highest discount
    let highestDiscount = '0%';
    if (highestPercentageCoupon && highestFixedCoupon) {
      highestDiscount = highestPercentageCoupon.discountAmount > highestFixedCoupon.discountAmount / 100 * 100 ?
        `${highestPercentageCoupon.discountAmount}%` :
        `$${highestFixedCoupon.discountAmount}`;
    } else if (highestPercentageCoupon) {
      highestDiscount = `${highestPercentageCoupon.discountAmount}%`;
    } else if (highestFixedCoupon) {
      highestDiscount = `$${highestFixedCoupon.discountAmount}`;
    }

    // Get coupons expiring soon (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringSoon = await Coupon.countDocuments({
      status: 'active',
      expiresAt: { $gte: now, $lte: thirtyDaysFromNow }
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalCoupons,
        activeCoupons,
        highestDiscount,
        expiringSoon
      }
    });
  } catch (error) {
    console.error("Error fetching coupon stats:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching coupon statistics"
    });
  }
});

router.get("/coupons/available-products", async (req, res) => {
  try {
    const plans = await Plan.find().select('_id name productId plans');

    const formattedProducts = plans.map(plan => ({
      _id: plan._id,
      name: plan.name,
      productId: plan.productId
    }));

    return res.status(200).json({
      success: true,
      products: formattedProducts
    });
  } catch (error) {
    console.error("Error fetching available products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching available products"
    });
  }
});



module.exports = router;
