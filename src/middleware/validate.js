const { validationResult } = require('express-validator');

/**
 * Middleware: run express-validator checks and return 422 on failure.
 * Usage: router.post('/route', [...validationChain], validate, controller)
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'error',
      code: 422,
      message: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }

  next();
}

module.exports = validate;
