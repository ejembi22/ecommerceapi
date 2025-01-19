const Joi = require('joi')
const mongoose = require('mongoose')
const {Schema} = require('mongoose')

const orderSchema = new mongoose.Schema({
    user:{
       type:mongoose.Schema.Types.ObjectId,
       ref:'User',
       required:true
    },
    products:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            required:true,
            min:1
        },
        price:{
            type:Number,
            required:true,
        }

    }],
    shippingAddress:{
        name:{ type:String,   required: true,},
        street:{  type:String, required: true},
        city:{  type:String,required:true},
        postalcode:{ type:Number,required:true},
        country:{ type:String, required:true}
    },

    paymentInfo:{
        method:{ type:String,  required: true},
        status:{type:String,enum:['pending', 'paid', 'failed'],default:'pending'}
    },
    status:{
        type:String,
        enum:['pending', 'shipped', 'delivered', 'cancelled'],
        default:'pending'
    },
    totalAmount:{
        type:Number,
        required: true,
    },

    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }


})

orderSchema.pre('save', function(next){
    this.totalAmount = this.products.reduce((total, product) =>total + (product.quantity * product.price), 0)
    next()
})

const Order = mongoose.model('Order', orderSchema)

module.exports = Order;