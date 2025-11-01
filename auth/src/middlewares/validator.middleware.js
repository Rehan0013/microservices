const { body, validationResult } = require("express-validator");

const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};

const registerUserValidation = [
  body("username")
    .isString()
    .withMessage("Username must be string")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 character long"),

  body("email").isEmail().withMessage("Invalid Email Address"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 character long"),

  body("fullName.firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .withMessage("First name must be string"),

  body("fullName.lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be string"),

  body("role")
    .optional()
    .isIn(["user", "seller"])
    .withMessage("Role must be either user or seller"),

  responseWithValidationErrors,
];

const loginUserValidation = [
  body("username").optional().notEmpty().withMessage("Username is required"),

  body("email").optional().notEmpty().withMessage("Email is required"),

  body("password").notEmpty().withMessage("Password is required"),

  responseWithValidationErrors,
];

const userAddressValidation = [
  body("street")
    .notEmpty()
    .withMessage("Street is required")
    .isString()
    .withMessage("Street must be string"),

  body("city")
    .notEmpty()
    .withMessage("City is required")
    .isString()
    .withMessage("City must be string"),

  body("state")
    .notEmpty()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be string"),

  body("pincode").notEmpty().withMessage("Pincode is required"),

  body("country")
    .notEmpty()
    .withMessage("Country is required")
    .isString()
    .withMessage("Country must be string"),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be boolean"),

  responseWithValidationErrors,
];

module.exports = {
  registerUserValidation,
  loginUserValidation,
  userAddressValidation,
};
