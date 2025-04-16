const Joi = require('joi')
const mongoose = require('mongoose')

const cartschema = new mongoose.Schema({
    customer:{
        type: new mongoose.Schema({
            name:{
                type:String,
                required: true,
                minlength: 3,
                maxlength: 50
            },
        
            // isGold:{
            //     type:Boolean,
            //     default: false,
            // },
        
            phoneNumber:{
                type:String,
                required: true,
                min: 5,
                max: 50
            }


        }),
        required:true
    },

    product:{
        type: new mongoose.Schema({
            name:{
                type:String,
                required: true,
                minlength: 5,
                maxlength: 225
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
        
          

            total_price:{
                type:Number,
                required:true
            },

            quantity:{
                type:Number,
                required:true
            }

        }),

        required:true
    },

    created_at:{
        type:Date
    },

    updated_at:{
        type:Date
    },
    status:{
        type:String
    }



})

const Cart = mongoose.model('Cart', cartschema)
function validateCart(cart){
    const schema = Joi.object({
        customer:Joi.object({
         name:Joi.string().min(3).max(50).required(),
        //  isGold:Joi.boolean(),
         phoneNumber:Joi.string().min(5).max(50).required()   

        })
        .required(),

        productId:Joi.string().required(),  // Add validation for 'productId'

        product: Joi.object({
        quantity:Joi.number().required() // Validate 'quantity' only since you get the rest of the product info from DB

        })
        .required()
    })

    return schema.validate(cart)

}


exports.Cart = Cart;
exports.validate = validateCart
