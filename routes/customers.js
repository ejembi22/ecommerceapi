const {Customer,  validateCustomer} = require ('../model/customer')
const express = require('express')
const router = express.Router();
const bcrypt = require('bcryptjs');
const { default: mongoose } = require('mongoose');
const crypto = require('crypto'); // ✅ For generating reset tokens
const nodemailer = require('nodemailer'); // ✅ For sending reset emails
const { parsePhoneNumberFromString } = require('libphonenumber-js'); // ✅ Improved phone validation
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth')


// ✅ Get all customers
router.get('/', async(req, res)=>{
    try{
        const customers = await Customer.find().sort('name').select('-password') // Exclude password
        res.send(customers)
    } catch (error){
        console.error(error);
        res.status(500).send('Internal Server Error: Unable to retrieve customers.');
    }
    
});


// ✅ Create a new customer
router.post('/', async (req, res) => {
    console.log("Received Request Body:", req.body); // ✅ Log full request
    console.log("Received phone number:", req.body.phoneNumber); // Debugging line

    try {
        const { error } = validateCustomer(req.body);
        if (error) {
            console.error("Joi Validation Error:", JSON.stringify(error.details, null, 2)); // ✅ Log Joi validation issues
            return res.status(400).json({ error: error.details });
        }

        let customer = await Customer.findOne({ email: req.body.email });
        if (customer) return res.status(400).send('Customer already registered');

        // ✅ Phone Number Validation
        const phoneNumber = parsePhoneNumberFromString(req.body.phoneNumber);
        if (!phoneNumber || !phoneNumber.isValid()) {
            console.error("❌ Invalid Phone Number:", req.body.phoneNumber);
            return res.status(400).json({error:"The phone number is incorrect. Please enter a valid phone number including country code (e.g., +1 123-456-7890)."});
        }
        
        console.log("✅ Valid Phone Number:", phoneNumber.formatE164());
        

        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        customer = new Customer({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            phoneNumber: phoneNumber.formatE164(), // 🛠️ Ensure correct formatting
            shippingAddress: req.body.shippingAddress,
            billingAddress: req.body.billingAddress
        });

        await customer.save();
        return res.status(201).send({ // 🛠️ Ensure `res.send()` is only called once
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            shippingAddress: customer.shippingAddress,
            billingAddress: customer.billingAddress,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error: Unable to create customer.');
    }
});

// ✅ Password Reset - Generate Reset Token
router.post('/forgot-password', async(req, res)=>{
    try {
        if(!req.body.email){
            return res.status(400).send('Email is required');
        }
        const customer = await Customer.findOne({ email: req.body.email });
        if (!customer) return res.status(404).send('Customer not found');

        // ✅ Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        customer.resetPasswordToken = hashedToken;
        customer.resetPasswordExpires = Date.now() + 3600000; // 1-hour expiration
        await customer.save({ validateBeforeSave: false });
        if (process.env.NODE_ENV === 'development') {
            console.log("Generated Reset Token:", resetToken);
            console.log("Hashed Token Stored in DB:", hashedToken);
        }
        


        // ✅ Define reset URL using frontend environment variable
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // ✅ Check if email service environment variables are set
        if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("❌ Missing Email Configuration: Check your environment variables.");
            return res.status(500).json({ 
                error: "We are currently unable to send password reset emails. Please try again later or contact support." 
            });
        }
        

        // ✅ Configure Mailtrap SMTP Transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // ✅ Ensure TLS settings match Mailtrap
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // ✅ Fix SSL issue
            }
        });

        // ✅ Define mailOptions correctly before sending the email
        const mailOptions = {
            from: '"Your E-commerce Store" <no-reply@yourstore.com>',
            to: req.body.email,
            subject: 'Password Reset Request',
            html: `
                <div style="max-width:500px; margin:auto; padding:20px; font-family:Arial, sans-serif; border:1px solid #ddd; border-radius:10px; text-align:center;">
                    <h2 style="color:#ff6600;">Password Reset</h2>
                    <p style="color:#555;">Click the button below to reset your password:</p>
                    <a href="${resetUrl}" style="background-color:#ff6600; color:white; padding:10px 20px; text-decoration:none; font-size:14px; border-radius:5px; display:inline-block;">
                        Reset Your Password
                    </a>
                    <p style="margin-top:20px; color:#888;">If you did not request this, please ignore this email.</p>              
                </div>
            `
        };

        // ✅ Send the email
        try {
            let info = await transporter.sendMail(mailOptions);
            console.log("Email sent: ", info.messageId);
                 
         return res.send('Password reset link sent to your email');
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            res.status(500).send('Failed to send reset email. Please try again');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// ✅ Password Reset - Change Password

router.post('/reset-password/:token', async (req, res)=>{
    try{
        console.log(req.body.password);  // Log the password to check what's being received'
        if(!req.body.password || req.body.password.length < 6){   // ✅ Validate password before processing
            return res.status(400).send('Password must be at least 6 characters long')
        }

        // Enforce strong password requirements
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(req.body.password)) {
            return res.status(400).json({ 
                error: "Password must be at least 6 characters long and include one uppercase letter, one number, and one special character."
            });
        }

        // const resetToken = req.params.token
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex'); // 🔥 Hash incoming token
        const customer = await Customer.findOne({
            resetPasswordToken: hashedToken, // ✅ Compare with stored hashed token
            resetPasswordExpires: { $gt: Date.now()}
        });

        if (!customer) {
            console.error("❌ Invalid or Expired Reset Token Used:", req.params.token);
            return res.status(400).json({ 
                error: "Your password reset link has expired or is invalid. Please request a new one." 
            });
        }
        
        //Prevent password reuse
        const isSamePassword = await bcrypt.compare(req.body.password, customer.password);
        if (isSamePassword) {
            return res.status(400).json({ error: "New password cannot be the same as the old password" });
        }

        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(req.body.password, salt);
        customer.resetPasswordToken = null; // Clear reset token immediately after updating password
        customer.resetPasswordExpires = null;
        await customer.save({validateBeforeSave: false});

        res.json({message:'Password has been reset successfully'});
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
})

// ✅ Update a customer
router.put('/:id', async (req, res) => {
    try {
        console.log("Received Update Request:", req.body); // ✅ Log request data

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.error("Invalid Customer ID:", req.params.id);
            return res.status(400).json({ error: "Invalid Customer ID" });
        }

        let updateFields = { ...req.body };

        // ✅ Phone Number Validation
        if (req.body.phoneNumber) {
            console.log("Received phone number:", req.body.phoneNumber);
    
            const phoneNumber = parsePhoneNumberFromString(req.body.phoneNumber); // Try specifying a default country
            if (!phoneNumber || !phoneNumber.isValid()) {
                console.error("Phone number is invalid:", req.body.phoneNumber);
                return res.status(400).json({ error: "Invalid phone number format (not valid)" })           
             }
            console.log("Validated Phone Number:", phoneNumber.formatInternational());
            updateFields.phoneNumber = phoneNumber.formatInternational();
            
        }

        // ✅ Ensure email uniqueness check on update
        if (req.body.email) {
            let existingCustomer = await Customer.findOne({ email: req.body.email });
            if (existingCustomer && existingCustomer._id.toString() !== req.params.id) {
                return res.status(400).json({ error: "Email already in use by another customer." });
            }
        }

        // ✅ Perform the Update
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true }
        ).select('-password'); // Exclude password in response

        if (!customer) {
            console.error("Customer not found after update:", req.params.id);
            return res.status(404).json({ error: "Customer not found" });
        }

        console.log("Customer updated successfully:", customer);
        res.json(customer);

    } catch (error) {
        console.error("Error updating customer:", error);
        res.status(500).json({ error: "Internal Server Error: Unable to update customer." });
    }
});



// ✅ Get customer by ID
router.get('/:id', async(req, res)=>{
    try{ 
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).send('Invalid customer ID')
        }
         const customer = await Customer.findById(req.params.id).select('-password') // Exclude password 
         if(!customer) return res.status(404).send('Customer not found') 
         res.send(customer); 
    }catch (error){
        console.error(error);
        res.status(500).send('Internal Server Error: Unable to retrieve customer');
    }
       
});

// ✅ Delete a customer
router.delete('/:id', async(req, res)=>{
    try{
        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).send('Invalid Customer ID')
        }
         const customer = await Customer.findByIdAndDelete(req.params.id);
         if(!customer) return res.status(404).send('Customer not found') 
         res.send(customer)  
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error: '  +  error.message);
    }
     
})
















module.exports = router