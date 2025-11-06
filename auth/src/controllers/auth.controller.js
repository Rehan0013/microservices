const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const redis = require("../db/redis");

const { publishToQueue } = require("../broker/borker");

const registerUserController = async (req, res) => {
  const {
    username,
    email,
    password,
    fullName: { firstName, lastName },
    role,
  } = req.body;

  const isUserExisted = await userModel.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserExisted) {
    return res.status(400).json({
      message: "Username or Email already exists",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
      fullName: {
        firstName,
        lastName,
      },
      role: role || "user",
    });

    await Promise.all([
      publishToQueue("AUTH_NOTIFICATION.USER_CREATED", {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      }),
      publishToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", user),
    ]);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.status(201).json({
      message: "User Register Successfully",
      user: user,
      token: token,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const loginUserController = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = await userModel
      .findOne({
        $or: [{ username }, { email }],
      })
      .select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.status(200).json({
      message: "User Logged In Successfully",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
      token: token,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getUserController = async (req, res) => {
  res.status(200).json({
    message: "User Fetched Successfully",
    user: req.user,
  });
};

const logoutUserController = async (req, res) => {
  const token = req.cookies.token;

  if (token) {
    await redis.set(`blacklist:${token}`, true, "EX", 7 * 24 * 60 * 60); // 7 days expiration
  }

  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
  });

  res.status(200).json({
    message: "User Logged Out Successfully",
  });
};

const getUserAdressesController = async (req, res) => {
  res.status(200).json({
    message: "User Addresses Fetched Successfully",
    addresses: req.user.addressess,
  });
};

const addUserAddressController = async (req, res) => {
  const id = req.user._id;

  const { street, city, state, pincode, country, isDefault } = req.body;

  const user = await userModel.findOneAndUpdate(
    { _id: id },
    {
      $push: {
        addressess: {
          street,
          city,
          state,
          pincode,
          country,
          isDefault,
        },
      },
    },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.status(200).json({
    message: "User Address Added Successfully",
    addresses: user.addressess,
  });
};

const deleteUserAddressController = async (req, res) => {
  const userId = req.user._id;
  const { addressId } = req.params;

  const isaddressExist = await userModel.findOne({
    _id: userId,
    "addressess._id": addressId,
  });

  if (!isaddressExist) {
    return res.status(404).json({
      message: "Address not found",
    });
  }

  const user = await userModel.findOneAndUpdate(
    { _id: userId },
    {
      $pull: { addressess: { _id: addressId } },
    },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const addressExist = user.addressess.some(
    (addr) => addr._id.toString() === addressId
  );

  if (addressExist) {
    return res.status(500).json({
      message: "Failed to delete Address.",
    });
  }

  res.status(200).json({
    message: "Address deleted successfully",
    addresses: user.addressess,
  });
};

const updateUserAddressController = async (req, res) => {
  const id = req.user._id;
  const { addressId } = req.params;

  const { street, city, state, pincode, country, isDefault } = req.body;

  const isaddressExist = await userModel.findOne({
    _id: userId,
    "addressess._id": addressId,
  });

  if (!isaddressExist) {
    return res.status(404).json({
      message: "Address not found",
    });
  }

  const user = await userModel.findOneAndUpdate(
    { _id: id, "addressess._id": addressId },
    {
      $set: {
        "addressess.$.street": street,
        "addressess.$.city": city,
        "addressess.$.state": state,
        "addressess.$.pincode": pincode,
        "addressess.$.country": country,
        "addressess.$.isDefault": isDefault,
      },
    },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.status(200).json({
    message: "User Address Updated Successfully",
    addresses: user.addressess,
  });
};

module.exports = {
  registerUserController,
  loginUserController,
  getUserController,
  logoutUserController,
  getUserAdressesController,
  addUserAddressController,
  deleteUserAddressController,
  updateUserAddressController,
};
