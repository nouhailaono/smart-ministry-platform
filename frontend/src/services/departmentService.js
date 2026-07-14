import api from "./api";

// GET ALL
export const getDepartments = () => api.get("/departments");

// GET ONE
export const getDepartmentById = (id) =>
  api.get(`/departments/${id}`);

// CREATE
export const createDepartment = (data) =>
  api.post("/departments", data);

// UPDATE
export const updateDepartment = (id, data) =>
  api.put(`/departments/${id}`, data);

// DELETE
export const deleteDepartment = (id) =>
  api.delete(`/departments/${id}`);