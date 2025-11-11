const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const redis = require("../db/redis");

const admin = require("../config/firebase");

const { publishToQueue } = require("../broker/broker");

const registerUserController = async (req, res) => {
  const { firebaseId } = req.body;

  if (!firebaseId) {
    return res.status(400).json({
      success: false,
      message: "Firebase ID token is required",
    });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(firebaseId);
    const firebaseUid = decodedToken.uid;

    // Get user info from decoded token
    const email = decodedToken.email;
    const fullName = decodedToken.name;
    const profileImage = decodedToken.picture;

    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Invalid Firebase token data",
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create new user
    const user = await userModel.create({
      email,
      fullName,
      profileImage,
      firebaseId: firebaseUid,
      role: req.body.role || "student",
    });

    // Create backend JWT
    const token = jwt.sign(
      {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send cookie and response
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "User registration failed",
      error: error.message,
    });
  }
};

const loginUserController = async (req, res) => {
  const { firebaseId } = req.body;

  if (!firebaseId) {
    return res.status(400).json({
      success: false,
      message: "Firebase ID token is required",
    });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(firebaseId);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Invalid Firebase token",
      });
    }

    // Find existing user
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register first.",
      });
    }

    // Create backend JWT
     const token = jwt.sign(
      {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send cookie + response
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: user,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
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
    _id: id,
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
