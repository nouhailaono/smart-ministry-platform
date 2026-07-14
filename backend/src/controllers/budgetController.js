const Budget = require("../models/Budget");
const Project = require("../models/Project");

// CREATE BUDGET
exports.createBudget = async (req, res) => {
  try {
    const { projectId, totalBudget, spent = 0 } = req.body;

    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const remaining = totalBudget - spent;

    const budget = await Budget.create({
      projectId,
      totalBudget,
      spent,
      remaining,
    });

    res.status(201).json({
      message: "Budget created successfully",
      budget,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// GET ALL BUDGETS
exports.getAllBudgets = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      include: [
        {
          model: Project,
        },
      ],
    });

    res.json(budgets);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// GET BUDGET BY PROJECT
exports.getBudgetByProject = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: {
        projectId: req.params.projectId,
      },
      include: [Project],
    });

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// UPDATE BUDGET
exports.updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id);

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    const {
      totalBudget,
      spent,
      projectId,
    } = req.body;

    budget.totalBudget =
      totalBudget ?? budget.totalBudget;

    budget.spent =
      spent ?? budget.spent;

    budget.projectId =
      projectId ?? budget.projectId;

    budget.remaining =
      budget.totalBudget - budget.spent;

    await budget.save();

    // 🚨 OVESPENDING ALERT
    const percentage =
      (budget.spent / budget.totalBudget) * 100;

    let warning = null;

    if (percentage >= 100) {
      warning =
        "🚨 Budget exceeded! Project has overspent its allocated budget.";
    } else if (percentage >= 80) {
      warning =
        "⚠️ Budget usage has reached 80%.";
    }

    res.json({
      message: "Budget updated successfully",
      warning,
      budget,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// ADD EXPENSE
exports.addExpense = async (req, res) => {
  try {
    const { amount } = req.body;

    const budget = await Budget.findByPk(
      req.params.id
    );

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    budget.spent += Number(amount);

    budget.remaining =
      budget.totalBudget - budget.spent;

    await budget.save();

    const percentage =
      (budget.spent / budget.totalBudget) * 100;

    let warning = null;

    if (percentage >= 100) {
      warning =
        "🚨 Budget exceeded!";
    } else if (percentage >= 80) {
      warning =
        "⚠️ Budget usage has reached 80%.";
    }

    res.json({
      message: "Expense added successfully",
      warning,
      budget,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// DELETE BUDGET
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findByPk(
      req.params.id
    );

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    await budget.destroy();

    res.json({
      message: "Budget deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
// ANALYTICS
exports.getAnalytics = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      include: [Project],
    });

    const totalBudget = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.totalBudget || 0),
      0
    );

    const totalSpent = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.spent || 0),
      0
    );

    const totalRemaining = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.remaining || 0),
      0
    );

    const projectAnalytics = budgets.map(
      (budget) => ({
        project:
          budget.Project?.title || "Unknown",
        budget: budget.totalBudget,
        spent: budget.spent,
        remaining: budget.remaining,
      })
    );

    res.json({
      totalBudget,
      totalSpent,
      totalRemaining,
      projectAnalytics,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};