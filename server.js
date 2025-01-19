const mongoose = require('mongoose')
const express = require('express')
const app = express()
const cors = require('cors')
const categoryRoute = require('./routes/categorys')
const productRoute = require('./routes/products')
const customerRoute = require('./routes/customers')
const userRoute = require('./routes/users')
const authRoute = require('./routes/auth')
const cartRoute = require('./routes/carts')
const orderRoute = require('./routes/orders')
const config = require('config')

if(!config.get('jwtPrivateKey')){
    console.error('FATAL ERROR:jwtPrivateKey is not defined');
    process.exit(1)
}



// Allow CORS from the frontend (localhost:3000)
app.use(cors());
  



mongoose.connect('mongodb://localhost/ecommerceapi')

.then(() => console.log('Connected to MongoDB...'))
.catch(err =>console.log('Could not connect to MongoDB', err))

app.use(express.json());
app.use('/api/categorys', categoryRoute)
app.use('/api/products', productRoute)
app.use('/api/customers', customerRoute)
app.use('/api/users', userRoute)
app.use('/api/auth', authRoute)
app.use('/api/carts', cartRoute)
app.use('/api/orders', orderRoute)



const port = process.env.PORT || 5000

app.listen(port, () => console.log(`listening on port ${port}`))