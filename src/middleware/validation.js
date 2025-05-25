const { AppError } = require('./errorHandler');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return next(new AppError(`Validation failed: ${errorMessages.join(', ')}`, 400));
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
