import api from "./api";

/* ==========================
   GET ALL BUDGETS
========================== */
export const getBudgets = () => {
  return api.get("/budgets");
};

/* ==========================
   GET SINGLE BUDGET
========================== */
export const getBudgetById = (id) => {
  return api.get(`/budgets/${id}`);
};

/* ==========================
   CREATE BUDGET
========================== */
export const createBudget = (data) => {
  return api.post("/budgets", data);
};

/* ==========================
   UPDATE BUDGET
========================== */
export const updateBudget = (id, data) => {
  return api.put(`/budgets/${id}`, data);
};

/* ==========================
   DELETE BUDGET
========================== */
export const deleteBudget = (id) => {
  return api.delete(`/budgets/${id}`);
};

/* ==========================
   GET BUDGET BY PROJECT
========================== */
export const getBudgetByProject = (projectId) => {
  return api.get(`/budgets/project/${projectId}`);
};

/* ==========================
   ADD EXPENSE
========================== */
export const addExpense = (id, amount) => {
  return api.put(`/budgets/${id}/expense`, {
    amount,
  });
};

/* ==========================
   ANALYTICS
========================== */
export const getBudgetAnalytics = () => {
  return api.get("/budgets/analytics");
};