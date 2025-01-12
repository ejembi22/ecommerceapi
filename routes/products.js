const {Product, validate} = require('../model/product')
const {Category} = require('../model/category')
const express = require('express')
const { join } = require('lodash')
const router = express.Router()

router.get('/', async(req, res)=>{
    const products = await Product.find().sort('name')
    res.send(products)
})



router.post('/', async(req, res)=>{
    const {error} = validate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

     const category = await Category.findById(req.body.categoryId)
     if(!category) return res.status(400).send('Category with the given id not found')

      let product = new Product({
        name:req.body.name,
        genre:{
            _id:category._id,
            name: category.name
        },
        numberInStock: req.body.numberInStock,
        image:req.body.image,
        price:req.body.price,
        discountprice:req.body.discountprice,
        ratenumber:req.body.ratenumber,
        ratestars:req.body.ratestars
      })  

      product = await product.save();

      res.send(product)



})

router.put('/:id', async(req, res)=>{
    const {error} = await Product.findById(req.params.id)
    if(error) return res.status(400).send(error.details[0].message)

    const category = await Category.findById(req.body.categoryId)
    if(!category) return res.status(400).send('The Category with the given id not found')

    const product =  await Product.findByIdAndUpdate(req.params.id, 
        {

            name:req.body.name,
            category:{
                _id: category.id ,
                name: category.name

            },
            numberInStock:req.body.numberInStock,
            descritpion: req.body.description,
            image:req.body.image,
            price:req.body.price,
            discountprice:req.body.discountprice,
            ratenumber:req.body.ratenumber,
            ratestars:req.body.ratestars

    },

    {
        new: true
    }

)  

if(!product) return res.status(400).send('The Product with the given id not available')
    res.send(product)
})

router.delete('/:id', async(req, res)=>{
    const product = await Product.findByIdAndDelete(req.params.id)
    if(!product) return res.status(400).send('The Product with the id not found')

        res.send(product)
})

router.get('/:id', async(req, res) =>{
    const product = await Product.findById(req.params.id)
    if(!product) return res.status(400).send('The Product with the given id not available')
    res.send(product)
})






















































module.exports = router