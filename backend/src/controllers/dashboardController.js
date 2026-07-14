const User = require("../models/User");
const Department = require("../models/Department");
const Project = require("../models/Project");
const Task = require("../models/Task");

exports.getStats = async (req, res) => {
  try {
    // Basic counts
    const usersCount = await User.count();
    const departmentsCount = await Department.count();
    const projectsCount = await Project.count();
    const tasksCount = await Task.count();

    // Project status stats
    const activeProjects = await Project.count({
      where: { status: "IN_PROGRESS" }
    });

    const completedProjects = await Project.count({
      where: { status: "COMPLETED" }
    });

    const plannedProjects = await Project.count({
      where: { status: "PLANNED" }
    });

    const onHoldProjects = await Project.count({
      where: { status: "ON_HOLD" }
    });

    // Task stats
    const todoTasks = await Task.count({
      where: { status: "TODO" }
    });

    const inProgressTasks = await Task.count({
      where: { status: "IN_PROGRESS" }
    });

    const doneTasks = await Task.count({
      where: { status: "DONE" }
    });

    // Response
    res.json({
      success: true,
      stats: {
        usersCount,
        departmentsCount,
        projectsCount,
        tasksCount,

        projects: {
          activeProjects,
          completedProjects,
          plannedProjects,
          onHoldProjects
        },

        tasks: {
          todoTasks,
          inProgressTasks,
          doneTasks
        }
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};