// models/Task.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Project = require("./Project");
const User = require("./User"); // Add this

const Task = sequelize.define("Task", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM("TODO", "IN_PROGRESS", "DONE"),
    defaultValue: "TODO",
  },
  dueDate: {
    type: DataTypes.DATE,
  },
  // Add these fields if they don't exist
  assigneeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  }
});

// Relations
Project.hasMany(Task, { foreignKey: "projectId" });
Task.belongsTo(Project, { foreignKey: "projectId" });

// User associations for tasks
User.hasMany(Task, { foreignKey: "assigneeId", as: "assignedTasks" });
Task.belongsTo(User, { foreignKey: "assigneeId", as: "assignee" });

module.exports = Task;