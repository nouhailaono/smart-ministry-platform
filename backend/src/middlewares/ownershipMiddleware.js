const Task = require("../models/Task");

module.exports = async function checkTaskOwnership(req, res, next) {
  try {
    const taskId = req.params.id;

    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // admin bypass
    if (req.user.role === "admin") {
      return next();
    }

    // user can only access their own tasks
    if (req.user.role === "user" && task.userId !== req.user.id) {
      return res.status(403).json({ message: "Not your task" });
    }

    req.task = task;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Ownership check failed" });
  }
};