// backend/src/routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

// AI Service URL from environment
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Helper function to handle AI requests
const callAIService = async (endpoint, method = "get", data = null) => {
  try {
    const response = await axios({
      method,
      url: `${AI_SERVICE_URL}${endpoint}`,
      data,
      timeout: 30000, // 30 seconds timeout
      validateStatus: false // Don't throw on non-2xx status
    });
    return response;
  } catch (error) {
    console.error(`AI Service Error (${endpoint}):`, error.message);
    return {
      status: 503,
      data: {
        success: false,
        error: "AI service unavailable",
        details: error.message
      }
    };
  }
};

// ============================================
// AI Service Health
// ============================================
router.get("/health", async (req, res) => {
  const response = await callAIService("/health");
  res.status(response.status || 200).json({
    success: response.status === 200,
    ...response.data,
    backend: "connected"
  });
});

// ============================================
// Get AI Model Information
// ============================================
router.get("/model-info", async (req, res) => {
  const response = await callAIService("/model-info");
  res.status(response.status || 200).json(response.data);
});

// ============================================
// Get Feature Names
// ============================================
router.get("/feature-names", async (req, res) => {
  const response = await callAIService("/feature-names");
  res.status(response.status || 200).json(response.data);
});

// ============================================
// Predict Risk for a Single Project
// ============================================
router.post("/predict", async (req, res) => {
  try {
    const response = await callAIService("/predict", "post", req.body);
    
    if (response.status === 200) {
      res.json({
        success: true,
        ...response.data
      });
    } else {
      res.status(response.status || 500).json({
        success: false,
        error: "AI prediction failed",
        details: response.data
      });
    }
  } catch (error) {
    console.error("Prediction Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get AI prediction",
      details: error.message
    });
  }
});

// ============================================
// Batch Predict Risk
// ============================================
router.post("/predict/batch", async (req, res) => {
  try {
    const response = await callAIService("/predict/batch", "post", req.body);
    
    if (response.status === 200) {
      res.json({
        success: true,
        ...response.data
      });
    } else {
      res.status(response.status || 500).json({
        success: false,
        error: "AI batch prediction failed",
        details: response.data
      });
    }
  } catch (error) {
    console.error("Batch Prediction Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get AI batch predictions",
      details: error.message
    });
  }
});

// ============================================
// Get Detailed Explanation for a Prediction
// ============================================
router.post("/explain", async (req, res) => {
  try {
    const response = await callAIService("/explain", "post", req.body);
    
    if (response.status === 200) {
      res.json({
        success: true,
        ...response.data
      });
    } else {
      res.status(response.status || 500).json({
        success: false,
        error: "AI explanation failed",
        details: response.data
      });
    }
  } catch (error) {
    console.error("Explanation Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get AI explanation",
      details: error.message
    });
  }
});

// ============================================
// Run What-If Analysis
// ============================================
router.post("/what-if", async (req, res) => {
  try {
    const { scenario, adjustments } = req.body;
    
    if (!scenario || !adjustments) {
      return res.status(400).json({
        success: false,
        error: "Missing scenario or adjustments"
      });
    }

    // Apply adjustments to scenario
    const adjustedScenario = { ...scenario };
    
    // Map adjustments to AI fields
    if (adjustments.budget) {
      adjustedScenario.planned_budget_mad = scenario.budget * (adjustments.budget / 100);
      adjustedScenario.approved_budget_mad = adjustedScenario.planned_budget_mad * 0.95;
      adjustedScenario.contract_value_mad = adjustedScenario.planned_budget_mad * 0.90;
    }
    
    if (adjustments.resources) {
      adjustedScenario.estimated_team_size = Math.round(scenario.team_size * (adjustments.resources / 100));
    }
    
    if (adjustments.timeline) {
      adjustedScenario.planned_duration_days = Math.round(scenario.duration_days * (adjustments.timeline / 100));
    }
    
    if (adjustments.contractor_rating) {
      adjustedScenario.contractor_rating = Math.min(5, Math.max(1, scenario.contractor_rating * (adjustments.contractor_rating / 100)));
    }
    
    if (adjustments.staff_turnover) {
      adjustedScenario.staff_turnover = Math.min(1, Math.max(0, scenario.staff_turnover * (adjustments.staff_turnover / 100)));
    }
    
    if (adjustments.procurement_delay) {
      adjustedScenario.procurement_delay_days = Math.round(scenario.procurement_delay * (adjustments.procurement_delay / 100));
    }

    // Get prediction for adjusted scenario
    const response = await callAIService("/predict", "post", adjustedScenario);
    
    if (response.status === 200) {
      res.json({
        success: true,
        original: scenario,
        adjustments,
        adjusted_scenario: adjustedScenario,
        result: response.data
      });
    } else {
      res.status(response.status || 500).json({
        success: false,
        error: "What-if analysis failed",
        details: response.data
      });
    }
  } catch (error) {
    console.error("What-If Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to run what-if analysis",
      details: error.message
    });
  }
});

// ============================================
// Generate Project Recommendations
// ============================================
router.post("/recommendations", async (req, res) => {
  try {
    const { prediction, top_features } = req.body;
    
    if (!prediction) {
      return res.status(400).json({
        success: false,
        error: "Missing prediction data"
      });
    }

    let recommendations = [];
    let priority = "low";

    if (prediction === "High") {
      priority = "high";
      recommendations = [
        "Conduct immediate risk assessment review with all stakeholders",
        "Allocate additional oversight resources to this project",
        "Develop comprehensive contingency plans",
        "Schedule weekly risk monitoring meetings",
        "Escalate to senior management for review",
        "Consider alternative approaches or contractor changes"
      ];
      
      // Add specific recommendations based on top features
      if (top_features) {
        top_features.slice(0, 3).forEach(feature => {
          if (feature.feature.toLowerCase().includes('procurement')) {
            recommendations.push("Review and expedite procurement processes");
          } else if (feature.feature.toLowerCase().includes('audit')) {
            recommendations.push("Conduct immediate compliance audit");
          } else if (feature.feature.toLowerCase().includes('contractor')) {
            recommendations.push("Review contractor performance and consider renegotiation");
          } else if (feature.feature.toLowerCase().includes('turnover')) {
            recommendations.push("Address staff retention and training issues");
          } else if (feature.feature.toLowerCase().includes('compliance')) {
            recommendations.push("Implement compliance improvement plan");
          }
        });
      }
    } else if (prediction === "Medium") {
      priority = "medium";
      recommendations = [
        "Implement quarterly risk reviews",
        "Develop contingency plans",
        "Increase stakeholder communication",
        "Monitor key risk indicators monthly",
        "Prepare escalation procedures"
      ];
      
      if (top_features) {
        top_features.slice(0, 2).forEach(feature => {
          if (feature.feature.toLowerCase().includes('procurement')) {
            recommendations.push("Monitor procurement progress closely");
          } else if (feature.feature.toLowerCase().includes('audit')) {
            recommendations.push("Schedule compliance review");
          } else if (feature.feature.toLowerCase().includes('contractor')) {
            recommendations.push("Maintain regular contractor check-ins");
          }
        });
      }
    } else {
      priority = "low";
      recommendations = [
        "Follow standard monitoring procedures",
        "Regular progress reports",
        "Annual compliance audit",
        "Monitor key metrics quarterly",
        "Maintain stakeholder communication"
      ];
    }

    res.json({
      success: true,
      priority,
      recommendations: recommendations.slice(0, 10), // Limit to 10 recommendations
      total_recommendations: recommendations.length
    });
  } catch (error) {
    console.error("Recommendations Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate recommendations",
      details: error.message
    });
  }
});

module.exports = router;