const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Project = require("./Project");

const Budget = sequelize.define("Budget", {
  totalBudget: { type: DataTypes.FLOAT, defaultValue: 0 },
  spent: { type: DataTypes.FLOAT, defaultValue: 0 },
  remaining: { type: DataTypes.FLOAT, defaultValue: 0 },
});

Project.hasOne(Budget, { foreignKey: "projectId", onDelete: "CASCADE" });
Budget.belongsTo(Project, { foreignKey: "projectId" });

module.exports = Budget;