const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Department = require("./Department");
const Simulation = require("./Simulation");

const Project = sequelize.define("Project", {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM(
      "PLANNED",
      "IN_PROGRESS",
      "COMPLETED",
      "ON_HOLD"
    ),
    defaultValue: "PLANNED",
  },
});

Department.hasMany(Project, { foreignKey: "departmentId" });
Project.belongsTo(Department, { foreignKey: "departmentId" });

Project.hasMany(Simulation, {
  foreignKey: "projectId",
});

Simulation.belongsTo(Project, {
  foreignKey: "projectId",
});

module.exports = Project;