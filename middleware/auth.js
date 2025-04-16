const jwt = require('jsonwebtoken');
const config = require('config');

function auth(req, res, next) {
    let token = req.header('Authorization') || req.cookies.token;  // Check for token in Authorization header or cookies
    if (!token) return res.status(401).send('Access denied. No token provided.');

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length).trim();
    }

    try {
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
        req.user = decoded;
        console.log('User extracted from token:', req.user);
        next();
    } catch (ex) {
        res.status(400).send('Invalid token.');
    }
}


module.exports = auth;
