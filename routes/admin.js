const express = require("express");
const User = require("../models/user");
const router = express.Router();
const axios = require("axios");
const Plan = require("../models/plans");

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
          message: "Plan id is required",
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

module.exports = router;
