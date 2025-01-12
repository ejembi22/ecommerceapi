const Joi = require('joi')
const mongoose = require('mongoose')


const customerschema = new mongoose.Schema({
    name:{
        type:String,
        required: true,
        minlength: 3,
        maxlength: 50
    },

    isGold:{
        type:Boolean,
        default: false,
    },

    phoneNumber:{
        type:String,
        required: true,
        min: 5,
        max: 50
    }
})

const Customer = new mongoose.model("Customer", customerschema)

function validateCustomer(customer){
    const schema = {
        name: Joi.string().min(3).max(50).required(),
        isGold:Joi.boolean(),
        phoneNumber:Joi.string().min(5).max(50).required()
    }

    return Joi.validate(customer, schema)
}

exports.Customer = Customer;
exports.validate = validateCustomer