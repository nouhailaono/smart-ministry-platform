const allowRoles = (...roles) => {
  return (req, res, next) => {
    try {
      // 1. Ensure user exists (from auth middleware)
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized: user not authenticated"
        });
      }

      // 2. Ensure role exists
      const userRole = req.user.role;

      if (!userRole) {
        return res.status(403).json({
          message: "Forbidden: role missing"
        });
      }

      // 3. Check permission
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          message: "Forbidden: you don't have permission"
        });
      }

      // 4. Pass control
      next();
    } catch (error) {
      return res.status(500).json({
        message: "Role middleware error",
        error: error.message
      });
    }
  };
};

module.exports = allowRoles;