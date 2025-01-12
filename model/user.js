const Joi = require('joi')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const config = require('config')

const userschema = new mongoose.Schema({
    name:{
        type:String,
        required: true,
        minlength: 3,
        maxlength: 50,
    },

    email:{
        type:String,
        required: true,
        unique: true,
        minlength:5,
        maxlength:225
    },
    password:{
        type:String,
        minlength:5,
        maxlength:1024
    }
})

userschema.methods.generateAuthToken = function(){
    const token = jwt.sign({_id: this._id, isAdmin:this.isAdmin}, config.get('jwtPrivateKey'));
    return token;
}

const User = mongoose.model("User", userschema)
function validateUser(user){
    const schema = {
        name:Joi.string().min(3).max(50).required(),
        email:Joi.string().min(5).max(225).required().email(),
        password:Joi.string().min(5).max(225).required()
    }

    return Joi.validate(user, schema)
}

exports.User = User;
exports.validate = validateUser
