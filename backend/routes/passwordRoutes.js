import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

// ======================================
// 1. SMTP CONFIGURATION
// Created lazily so process.env is already loaded (dotenv) when first used
// ======================================

let transporter = null;

// Remove stray spaces/quotes from .env values
const clean = (v) => String(v || "").trim().replace(/^["']|["']$/g, "");

function getTransporter() {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST) return null;

    const port = Number(clean(process.env.SMTP_PORT) || 587);

    transporter = nodemailer.createTransport({
        host: clean(process.env.SMTP_HOST),
        port,
        secure: port === 465, // 465 = SSL, 587 = STARTTLS

        auth: {
            user: clean(process.env.SMTP_USER),
            pass: clean(process.env.SMTP_PASS)
        },

        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000
    });

    transporter
        .verify()
        .then(() => console.log("SMTP ready"))
        .catch((e) => console.error("SMTP verify failed:", e.message));

    return transporter;
}


// ======================================
// 2. PASSWORD RESET TOKEN MODEL
// ======================================

const resetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    tokenHash: {
        type: String,
        required: true,
        index: true
    },

    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
});

const PasswordReset =
    mongoose.models.PasswordReset ||
    mongoose.model("PasswordReset", resetSchema);


// ======================================
// 3. HASH RESET TOKEN
// ======================================

const hash = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");


// ======================================
// 4. SEND RESET EMAIL
// ======================================

async function sendResetLink(email, link) {
    const t = getTransporter();

    if (!t) {
        console.log(`[Password Reset] SMTP not configured for ${email}`);
        return;
    }

    const from =
        clean(process.env.MAIL_FROM) || clean(process.env.SMTP_USER);

    const info = await t.sendMail({
        from,
        to: email,
        replyTo: from,
        subject: "Reset Your EmoTunes Password",

        text: `Hello,

We received a request to reset your EmoTunes password.

Reset your password here (valid for 30 minutes):
${link}

If you did not request this, please ignore this email.

Regards,
EmoTunes Team`,

        html: `
            <p>Hello,</p>
            <p>We received a request to reset your EmoTunes password.</p>
            <p><a href="${link}">Reset your password</a> (valid for 30 minutes)</p>
            <p>Or copy this link into your browser:<br>${link}</p>
            <p>If you did not request this, please ignore this email.</p>
            <p>Regards,<br>EmoTunes Team</p>`
    });

    console.log(
        "Mail accepted:", info.accepted,
        "rejected:", info.rejected,
        "response:", info.response
    );

    if (!info.accepted || info.accepted.length === 0) {
        throw new Error("SMTP server rejected the recipient");
    }
}


// ======================================
// 5. FORGOT PASSWORD ROUTE
// POST /api/auth/forgot-password
// ======================================

router.post("/forgot-password", async (req, res) => {

    const generic = {
        success: true,
        message: "If that email is registered, a reset link has been sent."
    };

    try {

        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const user = await User.findOne({ email });

        console.log("Forgot-password for:", email, "| user found:", !!user);

        if (user) {

            const token = crypto.randomBytes(32).toString("hex");

            await PasswordReset.deleteMany({ user: user._id });

            await PasswordReset.create({
                user: user._id,
                tokenHash: hash(token),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000)
            });

            const base = (
                process.env.CLIENT_URL || "http://localhost:5173"
            ).replace(/\/$/, "");

            const link = `${base}/?reset=${token}`;

            // Wait for the mail to be handed to SMTP before responding
            try {
                await sendResetLink(user.email, link);
            } catch (mailError) {
                console.error(
                    "Password reset email failed:",
                    mailError.message
                );
                // Still return the generic response so emails can't be enumerated
            }
        }

        return res.status(200).json(generic);

    } catch (error) {

        console.error("Forgot password error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not send the reset link. Please try again."
        });
    }
});


// ======================================
// 6. RESET PASSWORD ROUTE
// POST /api/auth/reset-password
// ======================================

router.post("/reset-password", async (req, res) => {

    try {

        const { token, password } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is missing."
            });
        }

        if (!password || String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long."
            });
        }

        const record = await PasswordReset.findOne({
            tokenHash: hash(String(token)),
            expiresAt: { $gt: new Date() }
        });

        if (!record) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired."
            });
        }

        const passwordHash = await bcrypt.hash(String(password), 10);

        const result = await User.updateOne(
            { _id: record.user },
            { $set: { password: passwordHash } }
        );

        if (result.matchedCount === 0) {
            return res.status(400).json({
                success: false,
                message: "User account not found."
            });
        }

        await PasswordReset.deleteMany({ user: record.user });

        return res.status(200).json({
            success: true,
            message: "Password updated successfully."
        });

    } catch (error) {

        console.error("Reset password error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not reset the password. Please try again."
        });
    }
});


// ======================================
// 7. EXPORT ROUTER
// ======================================

export default router;