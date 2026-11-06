import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

// Reset tokens live in their own collection (no changes to your User model).
// MongoDB deletes expired documents automatically (TTL index on expiresAt).
const resetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});
const PasswordReset =
  mongoose.models.PasswordReset || mongoose.model("PasswordReset", resetSchema);

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Sends the email if SMTP is configured; otherwise prints the link in the
// backend terminal so you can test without any email setup.
async function sendResetLink(email, link) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[Password reset] Link for ${email}:\n${link}\n`);
    return;
  }
  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Reset your EmoTunes password",
    text: `Click the link below to set a new password (valid for 30 minutes):\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
  });
}

// POST /api/auth/forgot-password  { email }
router.post("/forgot-password", async (req, res) => {
  const generic = {
    success: true,
    message: "If that email is registered, a reset link has been sent.",
  };
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await PasswordReset.deleteMany({ user: user._id });
      await PasswordReset.create({
        user: user._id,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
      const link = `${base}/?reset=${token}`;
      try {
        await sendResetLink(user.email, link);
      } catch (mailError) {
        // Email failed (bad SMTP settings, nodemailer missing, etc.):
        // show why, and print the link so the reset can still be tested.
        console.error("Could not send reset email:", mailError.message);
        console.log(`\n[Password reset] Link for ${user.email}:\n${link}\n`);
      }
    }
    // Same answer whether or not the email exists, so accounts can't be probed.
    res.json(generic);
  } catch (error) {
    console.error("forgot-password error:", error.message);
    res.status(500).json({ message: "Could not send the reset link. Please try again." });
  }
});

// POST /api/auth/reset-password  { token, password }
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token) return res.status(400).json({ message: "Reset token is missing." });
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const record = await PasswordReset.findOne({
      tokenHash: hash(String(token)),
      expiresAt: { $gt: new Date() },
    });
    if (!record) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }

    // updateOne skips any pre-save hooks, so the password is hashed exactly once, here.
    const passwordHash = await bcrypt.hash(String(password), 10);
    await User.updateOne({ _id: record.user }, { $set: { password: passwordHash } });
    await PasswordReset.deleteMany({ user: record.user });

    res.json({ success: true, message: "Password updated." });
  } catch (error) {
    console.error("reset-password error:", error.message);
    res.status(500).json({ message: "Could not reset the password. Please try again." });
  }
});

export default router;
