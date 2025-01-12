const Joi = require('joi')

const mongoose = require('mongoose')

const categoryschema = new mongoose.Schema({
    name:{
        type:String,
        required: true,
        maxlength: 50,
        minlength: 5,

    },
   
})

const Category = mongoose.model('Category', categoryschema)

function validateCategory(category){
    const schema = {
        name: Joi.string().min(5).max(50).required()
    }

    return Joi.validate(category, schema)
    
}

exports.categoryschema = categoryschema
exports.Category = Category;
exports.validate = validateCategory