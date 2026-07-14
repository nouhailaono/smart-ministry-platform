import api from "./api";

// GET ALL USERS
export const getUsers = () => api.get("/users");

// GET ONE USER
export const getUserById = (id) =>
  api.get(`/users/${id}`);

// CREATE USER
export const createUser = (data) =>
  api.post("/users", data);

// UPDATE USER
export const updateUser = (id, data) =>
  api.put(`/users/${id}`, data);

// DELETE USER
export const deleteUser = (id) =>
  api.delete(`/users/${id}`);