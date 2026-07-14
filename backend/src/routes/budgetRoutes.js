const express = require("express");
const router = express.Router();

const budgetController = require("../controllers/budgetController");

// CRUD
router.get("/", budgetController.getAllBudgets);

router.get("/analytics", budgetController.getAnalytics);

router.get("/project/:projectId", budgetController.getBudgetByProject);

router.post("/", budgetController.createBudget);

router.put("/:id", budgetController.updateBudget);

router.delete("/:id", budgetController.deleteBudget);

// Expenses
router.post(
  "/:id/expense",
  budgetController.addExpense
);

module.exports = router;