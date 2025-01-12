const {User} = require("../model/user");
const _ =require('lodash')
const bcrypt = require('bcryptjs')
const Joi = require('joi')
const express = require('express');
const router = express.Router()
// const jwt = require('jsonwebtoken')
// const config = require('config')


// router.get('/', async(req, res) =>{ 
//     const user = await User.find().sort() ;
//     res.send(user)
// })
router.post('/', async(req, res)=>{
    const {error} = validate(req.body);
    if(error) return res.status(400).send(error.details[0].message);

    let user = await User.findOne({email:req.body.email});
    if(!user) return res.status(400).send('invalid email and password .');

    // user = new User({
    //     name: req.body.name,
    //     email:req.body.email,
    //     password:req.body.password
    // });

//    const salt = await bcrypt.genSalt(10);
//    user.password = await bcrypt.hash(user.password, salt);

//     await user.save();

const validPassword = await bcrypt.compare(req.body.password, user.password);
if(!validPassword) return res.status(400).send('Invalid email or password.')



    // const token = jwt.sign({_id: user._id, name: user.name}, config.get('jwtPrivateKey'))    //you wrap your jwtprivatekey with your config.get//
   const token = user.generateAuthToken()
    res.send(token)
})



function validate(req){
    const schema = {
        email:Joi.string().min(5).max(255).required().email(),
        password:Joi.string().min(5).max(255).required()
    };

    return Joi.validate(req, schema)
}











module.exports = router