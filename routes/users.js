const { User } = require('../model/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require("../middleware/auth");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Joi = require('joi')
const { Customer } = require('../model/customer'); 


// Get logged-in user details
router.get('/me', auth, async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    res.send(user);
});

// Register user & send OTP
router.post('/', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpires,
        });

        await newUser.save();

        // Send OTP via email
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            html: `
                <div style="max-width:500px; margin: auto; padding:20px; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; text-align: center;">
                    <h2 style="color:#333;">Email Verification</h2>
                    <p style="font-size: 16px; color:#555;">Use the OTP below to verify your email. This OTP will expire in 10 minutes.</p>
                    <div style="font-size:20px; font-weight: bold; color:white; background-color:rgb(0, 30, 255); padding:10px; border-radius:5px; display:inline-block;">${otp}</div>
                    <p style="margin-top:20px; color:#888;">If you did not request this, please ignore this email.</p>
                </div>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent to your email. Please verify.' });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find the user in the User collection
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or OTP." });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "Email already verified." });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        // ✅ Mark user as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // ✅ Create Customer entry
        const newCustomer = new Customer({
            userId: user._id,   // Fix: Link customer to user
            name: user.name,
            email: user.email,
            password: user.password, // Already hashed
            phoneNumber: "+14155552671", // Placeholder phone number
        });

        await newCustomer.save();

        res.status(200).json({ message: "Email verified successfully. Customer created." });

    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// Resend OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).send('User not found');

        const otp = crypto.randomInt(100000, 999999).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Resend OTP Verification',
            html: `
                <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; text-align: center;">
                    <h2 style="color: #333;">Resend OTP</h2>
                    <p style="font-size: 16px; color: #555;">Use the OTP below to verify your email. This OTP will expire in 10 minutes.</p>
                    <div style="font-size: 22px; font-weight: bold; color: white; background-color: #007bff; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</div>
                    <p style="margin-top: 20px; color: #888;">If you did not request this, please ignore this email.</p>
                </div>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP resent successfully.' });
    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: "Error resending OTP." });
    }
});

// Validation function for the request body (password)
function validatePassword(data) {
    const schema = Joi.object({
        oldPassword: Joi.string().required().min(6).max(1024),
        password: Joi.string().required().min(6).max(1024),
    });
    return schema.validate(data);
}

// Update Password Route
router.put('/update-password', auth, async (req, res) => {
    try {
        // Log request body for debugging
        console.log('Request Body:', req.body);

        // Ensure oldPassword and newPassword are provided in the request
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Both oldPassword and newPassword are required." });
        }

        // Find the user
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Verify the old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect." });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Save the updated user
        await user.save();

        res.json({ message: "Password updated successfully." });
    } catch (err) {
        console.error("Error updating password:", err.message);
        res.status(500).json({ message: "Internal server error." });
    }
});





module.exports = router;
