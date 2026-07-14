// routes/simulationRoutes.js

const express = require("express");
const router = express.Router();

const {
  runSimulation,
} = require("../controllers/simulationController");

router.post("/run", runSimulation);

module.exports = router;