const express = require('express')
const router = express.Router()
const Order = require('../model/order')
const {Product} = require('../model/product')
const {User} = require('../model/user')
const auth = require('../middleware/auth')
const stripe = require('stripe')('sk_test_51Qj00xBpnFykODXYqvSIVKznaaqGWaCSjOFhUox6GORDFuCLoDptrbKP0GW2C5IfIRRnPud1UAe2DaNd9rlsggI600hnwOVivf')
const paypal = require('@paypal/checkout-server-sdk')
const config = require('config')

const environment = new paypal.core.SandboxEnvironment(
    'AZajYttvWu9q7eu8QGpJdlSEWW9owdPZJbkdUGuuaO92h7GKUC0i2DTrzJrENedxxKNsn7xx_6GO4NDI',
    'EFHPCx55lIRY-DHFPzK_doL8v9EXGE0Pc80L2GWMAiegO6F4mnv5Hz0eSqKzsmkBOXYHcXrpC5ejKYU3'
)

const client = new paypal.core.PayPalHttpClient(environment);

router.post('/', async(req, res)=>{
    try{
        console.log('Request Body:', req.body);  // Log the incoming request body
        console.log('Request User:', req.user);  // Log the decoded user (from token)


        const {products, shippingAddress,paymentInfo,} = req.body;
        const userId =req.user ? req.user._id: null;

        console.log('User Id:', userId)

        if (!userId) {
            return res.status(401).send('User authentication failed');
        }


        if(!products || !shippingAddress || !paymentInfo ){
            return res.status(400).send('All fields required')
        }

        // const user = await User.findById(userId)
        // if(!user) return res.status(400).send('User not found')

         let totalAmount = 0
         for (const item of products) {
            const product = await Product.findById(item.product)
            if(!product) return res.status(400).json({message:`Product ${item.product} not found`})

          totalAmount += item.quantity * product.price;
         }  

         const newOrder = new Order({
            user: userId,
            products,
            shippingAddress,
            paymentInfo,
            totalAmount
         });

         await newOrder.save()
        //  res.status(201).json(newOrder)   
        if(paymentInfo.method === 'CreditCard')  {

            const {paymentMethodId} = req.body;

            try{
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: totalAmount * 100,
                    currency: 'usd',
                    payment_method:'manual',
                    confirm:true,
                })

                if(paymentIntent.status === 'succeeded'){
                    newOrder.paymentInfo.status = 'paid';
                    await newOrder.save();
                    return res.status(200).json({success:true, message:'Payment Successful', order:newOrder, paymentIntent})
                }else {
                    return res.status(400).json({success:false, message:'Payment Failed', paymentIntent})
                }
            } catch (error){
                return res.status(500).json({message:'Payment Processing Failed'});
            }
        }  else if(paymentInfo.method === 'Paypal') {
            try{
                const request = new paypal.orders.OrdersCreateRequest();
                request.preferredLocale('en-US');
                request.requestBody({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount:{
                            currency_code: 'USD',
                            value: (totalAmount).toString()
                        },
                        description: 'E-commerce Order Payment'
                    }]
                })

                const response = await client.execute(request)
                const approveUrl = response.result.links.find(link => link.rel === 'approve').href

                return res.status(200).json({ approveUrl });
            } catch (error){
                console.error(error);
                return res.status(500).json({message:'Paypal Payment Creation Failed'})

            } 
        }    else {
            return res.status(400).send('Invalid Payment Method')
        }     
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Internal Server Error'})
    }
})

router.post('/paypal/captur', auth, async(req, res)=>{
    try{
        const {orderId, paymentId, payerId} = req.body;


        const order = await Order.findById(orderId)
        if(!order)return res.status(400).json({message:'Order not found'})
        
            const request = new paypal.orders.OrdersCaptureRequest(paymentId);
            request.requestBody({})
            const response = await client.execute(request)

            if(response.status.result === 'COMPLETED'){
                order.paymentInfo.status = 'paid';
                await order.save()

                return res.status(200).json({message:'Paypal Payment Successful', order})
            }else {
                return res.status(400).json({message:'PayPal payment failed', response})
            }
    }catch (error){
        console.error('Error in order route:', error)
        return res.status(500).json({message:'Internatl Server Error'})
    }
})



module.exports = router
