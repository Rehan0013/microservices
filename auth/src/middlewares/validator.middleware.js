const { body, validationResult } = require("express-validator");

const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};

const registerUserValidation = [
  body("firebaseId")
    .notEmpty()
    .withMessage("FirebaseId must not be empty.")
    .isString()
    .withMessage("Firebase ID must be string"),

  body("email").isEmail().withMessage("Invalid Email Address"),

  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isString()
    .withMessage("Full name must be string"),

  body("role")
    .optional()
    .isIn(["user", "seller"])
    .withMessage("Role must be either user or seller"),

  responseWithValidationErrors,
];

const loginUserValidation = [
  body("email").notEmpty().withMessage("Email is required"),

  body("firebaseId")
    .notEmpty()
    .withMessage("FirebaseId must not be empty.")
    .isString()
    .withMessage("Firebase ID must be string"),

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
