const { z } = require('zod');

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data: ' + err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        errors: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(err);
  }
};

module.exports = {
  validateBody,
  z
};
