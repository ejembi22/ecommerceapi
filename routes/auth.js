const {User} = require("../model/user");
const bcrypt = require('bcryptjs')
const Joi = require('joi')
const express = require('express');
const router = express.Router()


router.post('/', async(req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email or password." });

        // Check the password against the hashed one in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password." });

        // Generate a new token
        const token = await user.generateAuthToken();

        // Return token and success message
        res.json({ token, message: "Login successful!" });
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});





function validateLogin(req){
    const schema =Joi.object ({
        email:Joi.string().min(5).max(255).required().email(),
        password:Joi.string().min(5).max(255).required()
    });

    return schema.validate(req);
}




module.exports = router