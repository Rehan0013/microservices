const express = require("express");

const validators = require("../middlewares/validator.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post(
  "/register",
  validators.registerUserValidation,
  authController.registerUserController
);

router.post(
  "/login",
  validators.loginUserValidation,
  authController.loginUserController
);

router.get(
  "/me",
  authMiddleware.authMiddleware,
  authController.getUserController
);

router.get("/logout", authController.logoutUserController);

router.get(
  "/users/me/addresses",
  authMiddleware.authMiddleware,
  authController.getUserAdressesController
);

router.post(
  "/users/me/addresses",
  validators.userAddressValidation,
  authMiddleware.authMiddleware,
  authController.addUserAddressController
);

router.delete(
  "/users/me/addresses/:addressId",
  authMiddleware.authMiddleware,
  authController.deleteUserAddressController
)

router.patch(
  "/users/me/addresses/:addressId",
  validators.userAddressValidation,
  authMiddleware.authMiddleware,
  authController.updateUserAddressController
)

module.exports = router;
