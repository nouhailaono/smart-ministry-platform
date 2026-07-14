const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");

// CREATE TASK
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status || "TODO",
      dueDate: req.body.dueDate,
      projectId: req.body.projectId,
      assigneeId: req.body.assigneeId,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// GET ALL TASKS
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      include: [
        {
          model: Project,
        },
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name", "email", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// GET TASK BY ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        {
          model: Project,
        },
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// UPDATE TASK
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    await task.update({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      dueDate: req.body.dueDate,
      projectId: req.body.projectId,
      assigneeId: req.body.assigneeId,
    });

    const updatedTask = await Task.findByPk(task.id, {
      include: [
        {
          model: Project,
        },
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// DELETE TASK
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    await task.destroy();

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};