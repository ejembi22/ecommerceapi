const {Cart, validate} = require('../model/cart')
const {Customer} = require('../model/customer')
const {Product} = require('../model/product')
const express = require('express')
const router = express.Router()

router.get('/', async(req, res)=>{
    const cart = await Cart.find().sort('created_at')
    res.send(cart)
})

router.post('/', async(req, res)=>{
    console.log(req.body)  // Log the incoming request body for debugging


    const {error} = validate(req.body)   // Validate the request body using Joi
    if(error) return res.status(400).send(error.details[0].message)
    
    const customer = req.body.customer;
    
    const product = await Product.findById(req.body.productId); // Get the product using the productId
    if(!product) return res.status(400).send('Product with the given id not found')
    
    if(product.numberInStock === 0) return res.status(400).send('Product is out of stock')  

    // Calculate the total_price based on the product's price and the quantity from the request
     const totalprice = product.price * req.body.product.quantity;    
        
    let cart = new Cart({
        customer:{
            name:customer.name,
            isGold:customer.isGold,
            phoneNumber:customer.phoneNumber

        },
        product:{
            name:product.name,
            price:product.price,
            discountprice:product.discountprice,
            ratenumber:product.ratenumber,
            total_price:totalprice,   // Set the calculated total_price
            quantity:req.body.product.quantity  // Using quantity sent in the request
        },

        created_at:new Date(),
        updated_at: new Date(),
        status: "active"
    });
    
    cart = await cart.save();   // Save the cart
    
    // Update product stock based on the quantity purchased
    product.numberInStock -= req.body.product.quantity;
    await product.save()

    res.send(cart)   // Return the created cart
    
})

router.get('/:id', async(req, res)=>{
    const cart = await Cart.findById(req.params.id)
    if(!cart) return res.status(400).send('Cart with the given id not available')
    res.send(cart)     
})


module.exports = router