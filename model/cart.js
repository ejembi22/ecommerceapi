const mongoose = require('mongoose');
const Joi = require('joi');

// Define product schema (for embedded items)
const productSchema = new mongoose.Schema({
    name: { type: String, required: true, minlength: 5, maxlength: 225 },
    price: { type: Number, required: true },
    discountprice: { type: String, required: true },
    ratenumber: { type: Number, required: true },
    total_price: { type: Number, required: true },
    quantity: { type: Number, required: true }
});

// Cart schema with items array
const cartSchema = new mongoose.Schema({
    customer: {
        type: new mongoose.Schema({
            name: { type: String, required: true, minlength: 3, maxlength: 50 },
            phoneNumber: { type: String, required: true, minlength: 5, maxlength: 50 }
        }),
        required: true
    },
    items: [productSchema], // <-- This replaces the single product field
    created_at: { type: Date },
    updated_at: { type: Date },
    status: { type: String }
});

const Cart = mongoose.model('Cart', cartSchema);

// Validation for the incoming request (not database schema)
function validateCart(cart){
    const schema = Joi.object({
        customer: Joi.object({
            name: Joi.string().min(3).max(50).required(),
            phoneNumber: Joi.string().min(5).max(50).required()
        }).required(),

        productId: Joi.string().required(),

        product: Joi.object({
            quantity: Joi.number().min(1).required()
        }).required()
    });

    return schema.validate(cart);
}

exports.Cart = Cart;
exports.validate = validateCart;
