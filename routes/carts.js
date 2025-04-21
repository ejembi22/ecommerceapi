const { Cart, validate } = require('../model/cart');
const { Product } = require('../model/product');
const express = require('express');
const router = express.Router();

// Get all carts
router.get('/', async (req, res) => {
    const cart = await Cart.find().sort('created_at');
    res.send(cart);
});

// Add product to cart (create or update)
router.post('/', async(req, res) => {
    try {
        console.log(req.body); // Log the incoming request body for debugging

        // Validate the request body using Joi
        const {error} = validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);
        
        const customer = req.body.customer;

        // Get the product using the productId
        const product = await Product.findById(req.body.productId);
        if (!product) return res.status(400).send('Product with the given id not found');
        
        if (product.numberInStock === 0) return res.status(400).send('Product is out of stock');

        // Calculate the total price based on the quantity
        const totalprice = product.price * req.body.product.quantity;

        // Create a new cart with the provided data
        let cart = new Cart({
            customer: {
                name: customer.name,
                phoneNumber: customer.phoneNumber
            },
            items: [
                {
                    name: product.name,
                    price: product.price,
                    discountprice: product.discountprice,
                    ratenumber: product.ratenumber,
                    total_price: totalprice,
                    quantity: req.body.product.quantity
                }
            ],
            created_at: new Date(),
            updated_at: new Date(),
            status: 'active'
        });

        // Save the cart and check for errors
        cart = await cart.save(); // Try saving the cart
        console.log("Cart saved successfully:", cart); // Log the saved cart

        // Update product stock based on the quantity purchased
        product.numberInStock -= req.body.product.quantity;
        await product.save();

        // Send the saved cart as the response
        res.send(cart);
    } catch (err) {
        console.error("Error saving the cart:", err); // Log any errors during the save process
        res.status(500).send('Something went wrong while saving the cart.');
    }
});




// Get cart by ID
router.get('/:id', async (req, res) => {
    const cart = await Cart.findById(req.params.id);
    if (!cart) return res.status(400).send('Cart with the given id not available');
    res.send(cart);
});

module.exports = router;
