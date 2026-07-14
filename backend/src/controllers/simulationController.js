const Simulation = require("../models/Simulation");

exports.runSimulation = async (req, res) => {
  try {
    const {
      name,
      budget,
      timeline,
      resources,
      riskLevel,
      projectId,
    } = req.body;

    let budgetScore = Math.min(
      budget / 10000,
      100
    );

    let resourceScore = Math.min(
      resources * 5,
      100
    );

    let timelineScore = Math.max(
      100 - timeline * 3,
      0
    );

    let riskScore =
      riskLevel === "Low"
        ? 90
        : riskLevel === "Medium"
        ? 60
        : 30;

    const finalScore =
      budgetScore * 0.3 +
      resourceScore * 0.3 +
      timelineScore * 0.2 +
      riskScore * 0.2;

    let status = "High Risk";

    if (finalScore >= 85)
      status = "Excellent";
    else if (finalScore >= 70)
      status = "Good";
    else if (finalScore >= 50)
      status = "Average";

    const simulation =
      await Simulation.create({
        name,
        budget,
        timeline,
        resources,
        riskLevel,
        successRate: finalScore,
        riskScore,
        status,
        projectId,
      });

    res.status(201).json(simulation);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};