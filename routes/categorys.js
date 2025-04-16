const {Category, validate} = require('../model/category')
const express = require('express')
const router = express.Router()

router.get('/', async(req, res)=>{
    const categorys = await Category.find().sort('name')
    res.send(categorys)
})

router.post('/', async(req, res)=>{
    const {error} = validate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

        let category = new Category({name: req.body.name})

        category = await category.save();

        res.send(category)
})

router.get('/:id', async(req, res)=>{
  const category = await  Category.findById(req.params.id)

  if(!category) return res.status(400).send('The category with the given id not available')
    res.send(category)


})

router.put('/:id', async(req, res)=>{
    const {error} = validate(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    const category = await Category.findByIdAndUpdate(req.body.CategoryId,  {name: req.body.name},  
    {new:true})
    if(!category) return res.status(400).send('The category with the given id not found')       

})

router.delete('/:id', async(req, res)=>{
    const category = await  Category.findByIdAndDelete(req.params.id)

    if(!category) return res.status(400).send('The category with the given id not found')

    res.send(category)

})

//   




module.exports = router