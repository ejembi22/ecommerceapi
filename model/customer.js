const Joi = require('joi')
const mongoose = require('mongoose')
const { parsePhoneNumberFromString } = require('libphonenumber-js'); // ✅ Added for phone validation



const customerschema = new mongoose.Schema({
    name:{
        type:String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    email:{
        type:String,
        required: true,
        unique: true,
        lowercase:true
    },
    password:{
        type:String,
        required:true,
        minlength:6
    },

    isVerified:{
        type:Boolean,
        default: false,
    },

    // ✅ Added userId field to link Customer to User
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true, // Every customer must be linked to a user
        unique: true      // Prevent duplicate customers for the same user
    },
    phoneNumber: {
        type: String,
        default: "",
        validate: {
            validator: function (v) {
                if (!v) return true; // Allow empty string
                const phoneNumber = parsePhoneNumberFromString(v);
                return phoneNumber && phoneNumber.isValid();
            },
            message: props => `${props.value} is not a valid phone number! Use international format like +1234567890`
        },
        minlength: 5,
        maxlength: 15
    },
    
    
    
    shippingAddress:{
        street: { type: String, default:"" },
        city: { type: String, default:""},
        state: { type: String, default:"" },
        zipcode: { type: String, default:"" },
        country: { type: String, default:"" },
    },
    billingAddress:{
        street: { type: String, default:""},
        city: { type: String, default:"" },
        state: { type: String, default:"" },
        zipcode: { type: String, default:"" },
        country: { type: String, default:"" },
    },
    orders:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: "Order",
            validate: {
                validator: function (v) {
                    return mongoose.Types.ObjectId.isValid(v);
                },

                message: "Invalid Order ID format"
            }
        }
    ],
    wishlist:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product",
            validate: {
                validator: function (v) {
                    return mongoose.Types.ObjectId.isValid(v);
                },
                message: "Invalid Product ID format"
            }
        }
    ],

    otp:{
        type:String
    },
    otpExpires:{
        type: Date
    },
    resetPasswordToken: {
        type:String
    },
    resetPasswordExpires: { 
     type: Date,   
     index: { expires: "1h"}  // Ensures expired tokens are deleted automatically
     },
})

const Customer = new mongoose.model("Customer", customerschema)

function validateCustomer(customer){
    const schema = Joi.object({
        name: Joi.string().min(3).max(50).required(),
        email:Joi.string().email().required(),
        password:Joi.string().min(6).required(),
        isVerified:Joi.boolean(),
        phoneNumber: Joi.string()
    .trim()
    .min(5)
    .max(15)
    .custom((value, helpers)=>{
        const phoneNumber = parsePhoneNumberFromString(value);
        if(!phoneNumber || !phoneNumber.isValid()) {
            return helpers.message("Invalid phone number format. Use international format like +1234567890")
        }
        return value;
    }),

          shippingAddress:Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipcode: Joi.string().required(),
            country: Joi.string().required()
        }).required(),
        billingAddress: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipcode: Joi.string().required(),
            country: Joi.string().required()
        }).required(),
        orders: Joi.array().items(Joi.string().hex().length(24)).optional(),
        wishlist:Joi.array().items(Joi.string().hex().length(24)).optional(),

        userId: Joi.string().hex().length(24).required()
    })

   

    return schema.validate(customer, {abortEarly: false})
}

module.exports = { Customer, validateCustomer };
