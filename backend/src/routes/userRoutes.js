const express = require("express");
const router = express.Router();
const User = require("../models/User");

// GET ALL USERS
router.get("/", async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

// GET USER BY ID
router.get("/:id", async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json(user);
});

// CREATE USER
router.post("/", async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

// UPDATE USER
router.put("/:id", async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });

  await user.update(req.body);
  res.json(user);
});

// DELETE USER
router.delete("/:id", async (req, res) => {
  await User.destroy({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
});

module.exports = router;