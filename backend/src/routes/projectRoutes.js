const express = require("express");
const router = express.Router();

const Project = require("../models/Project");
const Department = require("../models/Department");
const Budget = require("../models/Budget");


// ======================
// GET ALL PROJECTS
// ======================
router.get("/", async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [Department, Budget],
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ======================
// CREATE PROJECT + BUDGET
// ======================
router.post("/", async (req, res) => {
  try {
    const { budget, ...projectData } = req.body;

    const project = await Project.create(projectData);

    await Budget.create({
      projectId: project.id,
      totalBudget: budget,
      spent: 0,
      remaining: budget,
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ======================
// UPDATE PROJECT + BUDGET
// ======================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { budget, ...projectData } = req.body;

    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ message: "Not found" });

    await project.update(projectData);

    const projectBudget = await Budget.findOne({
      where: { projectId: id },
    });

    if (projectBudget) {
      await projectBudget.update({
        totalBudget: budget,
        remaining: budget - projectBudget.spent,
      });
    }

    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ======================
// DELETE PROJECT + BUDGET
// ======================
router.delete("/:id", async (req, res) => {
  try {
    await Budget.destroy({ where: { projectId: req.params.id } });
    await Project.destroy({ where: { id: req.params.id } });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;