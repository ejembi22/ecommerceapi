const Joi = require('joi')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const config = require('config')
const {Customer} = require('./customer')

const userschema = new mongoose.Schema({
    name:{
        type:String,
        required: true,
        minlength: 3,
        maxlength: 50,
    },

    email:{
        type:String,
        required: true,
        unique: true,
        minlength:5,
        maxlength:225
    },
    password:{
        type:String,
        minlength:5,
        maxlength:1024,
        required: true
    },
    otp:{
        type:String
    },
    otpExpires:{
        type: Date
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    lastActive:{
        type:Date,
        default:Date.now
    }, 
    isVerified:{
        type:Boolean,
        default: false
    }
    
})

userschema.methods.generateAuthToken = async function () {
    const customer = await require("./customer").Customer.findOne({ userId: this._id });

    if (!customer) {
        console.error("Customer not found for user:", this._id);
        throw new Error("Customer not found");
    }

    const tokenPayload = {
        _id: this._id,
        isAdmin: this.isAdmin,
        customerId: customer._id  // Ensure the customer ID is in the payload
    };

    const token = jwt.sign(tokenPayload, config.get('jwtPrivateKey'));
    console.log("Generated token with payload:", tokenPayload);  // Ensure we see the token with customerId
    return token;
};






const User = mongoose.model("User", userschema)
function validateUser(user){
    const schema = Joi.object({
        name:Joi.string().min(3).max(50).required(),
        email:Joi.string().min(5).max(225).required().email(),
        password:Joi.string().min(5).max(1024).required(),
        
    })

    return schema.validate(user);
}

exports.User = User;
exports.validate = validateUser
