
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";

import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();


// ========================================
// SIGNUP
// POST /api/auth/signup
// ========================================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate input
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email, and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long."
      });
    }

    // 2. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Check whether the email already exists
    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    // 4. Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    // 6. Generate JWT token
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is missing from the .env file.");

      return res.status(500).json({
        message: "Server configuration error."
      });
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      secret,
      { expiresIn: "7d" }
    );

    // 7. Return successful response
    return res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    // A concurrent signup can still hit the unique email index.
    if (
      error.code === 11000 &&
      (
        error.keyPattern?.email ||
        error.keyValue?.email
      )
    ) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Signup failed. Please try again."
    });
  }
});


// ========================================
// LOGIN
// POST /api/auth/login
// ========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    // 2. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Find user and include password hash
    const user = await User.findOne({
      email: normalizedEmail
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // 4. Compare password with stored hash
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // 5. Check JWT configuration
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is missing from the .env file.");

      return res.status(500).json({
        message: "Server configuration error."
      });
    }

    // 6. Generate token
    const token = jwt.sign(
      { id: user._id.toString() },
      secret,
      { expiresIn: "7d" }
    );

    // 7. Return successful response
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});


// ========================================
// GET CURRENT USER PROFILE
// GET /api/auth/me
// Requires a valid JWT token
// ========================================
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email createdAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json({
      message: "Profile fetched successfully",
      user
    });

  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Could not fetch profile."
    });
  }
});

export default router;
