const jwt = require('jsonwebtoken')
const config = require('config')

function auth(req, res, next){
    const token = req.header('x-auth-token');
    console.log('Received token:', token); // Log token received in the request

    if(!token){
        console.log('No token provided'); // Log if there's no token
        return res.status(401).send('Access denied. No token Provided');

    } 

    try{
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'))
        console.log('Decoded token:', decoded); // Log the decoded token

        req.user = decoded;
        next();

    } catch(ex) {
        console.error('Invalid token error:', ex); // Log the error if token is invalid

        res.status(400).send('invalid token')
    }
}


module.exports = auth