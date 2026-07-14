// controllers/adminController.js
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

    // Get recent users (last 5)
    const recentUsers = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get recent projects (last 5)
    const recentProjects = await Project.findAll({
      attributes: ['id', 'title', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

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
        },

        recent: {
          users: recentUsers,
          projects: recentProjects
        }
      }
    });

  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Director stats
exports.getDirectorStats = async (req, res) => {
  try {
    const projectsCount = await Project.count();
    const activeProjects = await Project.count({
      where: { status: "IN_PROGRESS" }
    });
    const completedProjects = await Project.count({
      where: { status: "COMPLETED" }
    });

    const departmentsCount = await Department.count();
    const usersCount = await User.count();
    
    const totalProjects = await Project.count();
    const completedProjectsCount = await Project.count({
      where: { status: 'COMPLETED' }
    });
    const completionRate = totalProjects > 0 
      ? Math.round((completedProjectsCount / totalProjects) * 100) 
      : 0;

    // Get recent activities
    const recentActivities = await Project.findAll({
      attributes: ['id', 'title', 'status', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      stats: {
        projectsCount,
        activeProjects,
        completedProjects,
        departmentsCount,
        usersCount,
        completionRate,
        recentActivities
      }
    });

  } catch (error) {
    console.error("Error fetching director stats:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Manager stats
exports.getManagerStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get projects managed by this manager
    const myProjects = await Project.count({
      where: { managerId: userId }
    });

    // Get tasks for this manager's projects
    const teamTasks = await Task.count({
      include: [
        {
          model: Project,
          where: { managerId: userId }
        }
      ]
    });

    // Get pending tasks
    const pendingTasks = await Task.count({
      include: [
        {
          model: Project,
          where: { managerId: userId }
        }
      ],
      where: { 
        status: ['TODO', 'IN_PROGRESS'] 
      }
    });

    // Get recent tasks
    const recentTasks = await Task.findAll({
      attributes: ['id', 'title', 'status', 'priority', 'dueDate'],
      include: [
        {
          model: Project,
          where: { managerId: userId },
          attributes: ['title']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      stats: {
        myProjects,
        teamTasks,
        pendingTasks,
        teamMembers: 0,
        recentTasks
      }
    });

  } catch (error) {
    console.error("Error fetching manager stats:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Viewer stats
exports.getViewerStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get tasks assigned to this viewer
    const myTasks = await Task.count({
      where: { assigneeId: userId }
    });

    // Get completed tasks
    const completedTasks = await Task.count({
      where: { 
        assigneeId: userId,
        status: 'DONE' 
      }
    });

    // Get in-progress tasks
    const inProgressTasks = await Task.count({
      where: { 
        assigneeId: userId,
        status: 'IN_PROGRESS' 
      }
    });

    // Get detailed task list
    const taskList = await Task.findAll({
      attributes: ['id', 'title', 'status', 'priority', 'dueDate'],
      where: { assigneeId: userId },
      include: [
        {
          model: Project,
          attributes: ['title']
        }
      ],
      order: [['dueDate', 'ASC']],
      limit: 10
    });

    res.json({
      success: true,
      stats: {
        myTasks,
        completedTasks,
        inProgressTasks,
        upcomingTasks: 0,
        taskList
      }
    });

  } catch (error) {
    console.error("Error fetching viewer stats:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};