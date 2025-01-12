const Joi = require('joi')
const mongoose = require('mongoose')
const { categoryschema } = require('./category')
const { type } = require('joi/lib/types/object')
const { required } = require('joi/lib/types/lazy')

const productschema = new mongoose.Schema({
   
    name:{
        type:String,
        required: true,
        minlength: 5,
        maxlength: 225
    },

    category:{
        type: categoryschema,
        // required:true

    },
    numberInStock:{
        type:Number,
        required:true,
        minlength: 0,
        maxlength: 2000
    },

    image:{
        type:String,
        require: true

    },

    price:{
        type:Number,
        required:true,
    },
    discountprice:{
     type:String,
     required:true
    },

    ratenumber:{
        type:Number,
        required:true,

    },

    ratestars:{
        type:String,
        required:true,
    }

})

const Product = new mongoose.model('Product', productschema)

function validateProduct(product){
    const schema = {
        name: Joi.string().min(0).max(225).required(),
        categoryId: Joi.string().required(),
        numberInStock: Joi.number().min(0).required(),
        image:Joi.string().required(),
        price:Joi.number().required(),
        discountprice:Joi.string().required(),
        ratenumber:Joi.number().required(),
        ratestars:Joi.string().required()





    }

    return Joi.validate(product, schema)

}




exports.productschema = productschema
exports.Product = Product;
exports.validate = validateProduct
