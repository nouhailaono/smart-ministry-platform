const express = require("express");
const router = express.Router();
const Department = require("../models/Department");

// ======================
// GET ALL
// ======================
router.get("/", async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [["createdAt", "DESC"]],
    });

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
// CREATE
// ======================
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;

    const dept = await Department.create({
      name,
      description,
    });

    res.status(201).json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ======================
// UPDATE
// ======================
router.put("/:id", async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    const { name, description } = req.body;

    await dept.update({
      name,
      description,
    });

    res.json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ======================
// DELETE
// ======================
router.delete("/:id", async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    await dept.destroy();

    res.json({ message: "Department deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;