require('dotenv').config();
const express = require('express')
const router = express.Router()
const Order = require('../model/order')
const {Product} = require('../model/product')
const {User} = require('../model/user')
const auth = require('../middleware/auth')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk')
const mongoose = require('mongoose')
const generateInvoice = require('../utils/generateInvoice')
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer')
// const config = require('config')


const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
)

const client = new paypal.core.PayPalHttpClient(environment);

const sendInvoiceEmail = async (userEmail, invoicePath) => {
    if(!userEmail){
        console.error('No recipient email defined');
        return;
    }
    console.log(`📧 Sending invoice email to: ${userEmail}`)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth:{
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Your Order Invoice',
        text: 'Thank you for your purchase. Attach is your invoice.',
        attachments: [{
            filename: path.basename(invoicePath),
            path: invoicePath
        }]
    };

         try{
            await transporter.sendMail(mailOptions);
            console.log('Invoice email sent successfully');
         } catch (error) {
            console.error('Error sending invoice email:', error.message);
         }
};


router.post('/', auth, async(req, res)=>{
    try{
        console.log('Request Body:', req.body);  // Log the incoming request body
        console.log('Request User:', req.user);  // Log the decoded user (from token)


        const {products, shippingAddress,paymentInfo, paymentMethodId} = req.body;
        const userId =req.user ? req.user._id : null;
        console.log('Extracted User Id from auth:', req.user ? req.user._id : 'No user assigned');


        console.log('User Id:', userId)

        
        if (!userId) {
            console.error('❌ User authentication failed: No userId found in request');
            return res.status(401).json({ message: 'User authentication failed' });
        }
        
        
        if(!products || !shippingAddress || !paymentInfo ) return res.status(400).json({ message: 'All fields required'});
        

        
        // ✅ Fetch User Email if Missing
        let userEmail = req.user.email;
        if(!userEmail){
            const user = await User.findById(userId);
            if(user){
                userEmail = user.email;
            }
        }
         if (!userEmail) {
            console.error('No recipient email defined');
            return res.status(400).json({message: 'User email not found'})
         }


         // ✅ Calculate Total Amount
         let totalAmount = 0
         for (const item of products) {
            const product = await Product.findById(item.product)
            if(!product) return res.status(400).json({message:`Product ${item.product} not found`})

          totalAmount += item.quantity * product.price;
         }  
 
         // ✅ Create New Order
         const newOrder = new Order({
            user: userId,
            products,
            shippingAddress,
            paymentInfo,
            totalAmount
         });

         await newOrder.save()

        if(paymentInfo.method === 'CreditCard')  {

            if (!paymentMethodId) {
                return res.status(400).json({ message: 'Missing paymentMethodId for Stripe payment' });
            }


            try{
                let customer;
                if (req.user.stripeCustomerId) {
                    customer = await stripe.customers.retrieve(req.user.stripeCustomerId);
                } else {
                    customer = await stripe.customers.create({
                        payment_method: paymentMethodId,
                        email: req.user.email || 'default-email@example.com',
                        invoice_settings: { default_payment_method: paymentMethodId }
                    });
                    await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
                }



                console.log('Processing Stripe Payment....');
                // console.log('Total Amount:', totalAmount);
                // console.log('Payment Method ID:', paymentMethodId);


                const paymentIntent = await stripe.paymentIntents.create({
                    amount: totalAmount * 100,
                    currency: 'usd',
                    payment_method: paymentMethodId,
                    confirm:true,
                    customer: customer.id,
                    automatic_payment_methods:{
                        enabled: true,
                        allow_redirects: "never"
                    }
                });

                console.log('Payment Intent:', paymentIntent)

                if(paymentIntent.status === 'succeeded'){
                    const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, {
                        $set:{
                            "paymentInfo.status": "paid",
                            status: "processing"
                        }
                    }, { new: true });

                    const invoicePath = await generateInvoice(updatedOrder);
                    console.log(`Invoice saved at: ${invoicePath}`);
                    await sendInvoiceEmail(userEmail, invoicePath)
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Payment Successful',
                        order: updatedOrder,
                        invoicePath,
                        paymentIntent
                    });
                }else {
                    return res.status(400).json({success:false, message:'Payment Failed', paymentIntent})
                }
            } catch (error){
                console.error('Stripe Payment Error:', error.message);
                return res.status(500).json({message:'Internal Server Error', error: error.message});
            }
        }  else if(paymentInfo.method === 'Paypal') {
            try{
                const request = new paypal.orders.OrdersCreateRequest();
                // request.preferredLocale('en-US');
                request.requestBody({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount:{
                            currency_code: 'USD',
                            value: totalAmount.toFixed(2)
                        },
                        description: 'E-commerce Order Payment'
                    }]
                })

                const response = await client.execute(request)
                const approveLink = response.result.links.find(link => link.rel === 'approve');
if (!approveLink) {
    return res.status(500).json({ message: 'PayPal approve URL not found' });
}
return res.status(200).json({ approveUrl: approveLink.href });

            } catch (error){
                console.error('Paypal Payment Creation Failed:', error.message);
                return res.status(500).json({message:'Paypal Payment Creation Failed', error: error.message });

            } 
        }    else {
            return res.status(400).send('Invalid Payment Method')
        }     
    } catch (error) {
        console.error('Order Creation Error:', error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message });
    }
});

router.post('/paypal/capture', auth, async(req, res)=>{
    try{
        const { paypalOrderId, orderId } = req.body;
        
         // ✅ Ensure paypalOrderId and orderId exist
        if (!paypalOrderId || !orderId){
            return res.status(400).json({message:'Missing paypalOrderId or orderId'})

        }

        // ✅ Validate orderId as a proper MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'Invalid orderId format' });
        }
        // ✅ Fetch the order from the database
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).json({ message: 'Order not found in database' });
        }


        // ✅ Capture PayPal payment
        const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
            request.requestBody({})
            
            const response = await client.execute(request)
            if(response.result.status === 'COMPLETED'){
                // ✅ Update order payment status
                const updatedOrder = await Order.findByIdAndUpdate(order._id, 
                    {
                    $set:{
                        "paymentInfo.status": "paid",
                        status: "processing"
                    }
                }, { new: true });
                
                // order.paymentInfo.status = 'paid';
                // order.status = "processing"

                const invoicePath = await generateInvoice(updatedOrder);
                console.log(`Invoice saved at: ${invoicePath}`);

                return res.status(200).json({message:'Paypal Payment Successful', order: updatedOrder, invoicePath})
            }else {
                return res.status(400).json({message:'PayPal payment failed', response})
            }
    }catch (error){
        console.error('Paypal Capture Error:', error.message)
        return res.status(500).json({message:'Internal Server Error', error: error.message })
    }
})

router.get('/invoice/:orderId', auth, async (req, res)=>{
    try{
        const order = await Order.findById(req.params.orderId);
        if(!order) return res.status(404).json({message: 'Order not found'});
        
        const invoicePath = path.join(__dirname, `../invoices/invoice-${order._id}.pdf`);
        if(!fs.existsSync(invoicePath)){
            return res.status(404).json({ message: 'Invoice not found'});
        }
        res.download(invoicePath);
    } catch (error){
        res.status(500).json({ message: 'Error retrieving invoice', error: error.message});
    }
})



module.exports = router
