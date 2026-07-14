const express = require("express");
const router = express.Router();
const Department = require("../models/Department");

// ======================
// GET ALL DEPARTMENTS
// ======================
router.get("/", async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// GET BY ID
// ======================
router.get("/:id", async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// CREATE DEPARTMENT
// ======================
router.post("/", async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ======================
// UPDATE DEPARTMENT
// ======================
router.put("/:id", async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    await dept.update(req.body);
    res.json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ======================
// DELETE DEPARTMENT
// ======================
router.delete("/:id", async (req, res) => {
  try {
    await Department.destroy({ where: { id: req.params.id } });
    res.json({ message: "Department deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;