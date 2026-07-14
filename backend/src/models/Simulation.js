// models/Simulation.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Simulation = sequelize.define("Simulation", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  budget: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  timeline: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  resources: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  riskLevel: {
    type: DataTypes.ENUM(
      "Low",
      "Medium",
      "High"
    ),
    defaultValue: "Medium",
  },

  successRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  riskScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  status: {
    type: DataTypes.STRING,
    defaultValue: "Pending",
  },
});

module.exports = Simulation;