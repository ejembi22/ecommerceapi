const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const {Product} = require('../model/product')

const generateInvoice = async (order) =>{
    return new Promise(async (resolve, reject)=>{
        const doc = new PDFDocument();

        const invoiceDir = path.join(__dirname, '../invoices');
        if(!fs.existsSync(invoiceDir)){
            fs.mkdirSync(invoiceDir, { recursive: true});
        }
        const filePath = path.join(invoiceDir, `invoice-${order._id}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Invoice Title
        doc.fillColor('#333366').fontSize(20).text('INVOICE', {align: 'right', bold:true}, 50, 50)
        
        // Invoice Number
        doc.fillColor('black').fontSize(12).text(`Invoice Number : INV- ${order._id.toString().slice(-6).toUpperCase()}`, 50, 120);
        doc.text(`Order ID:${order._id} `);
        doc.text(`Date: ${new Date().toLocaleDateString()}`).moveDown(2)

        // Billing Information
        doc.fillColor('#333366').fontSize(12).text('Bill From:',50, 180,{bold:true} );
        doc.fillColor('black').text('E-Commerce Store', 50, 200);
        doc.text('3903 N County Rd #P Wittenberg, Wisconsin(WI), 54499', 50, 215);
        doc.text('support@ecommerce.com',50, 230);
        doc.text('(715) 253-2670', 50, 245).moveDown();

        doc.fillColor('#333366').fontSize(12).text('Bill To:', 420, 180, {bold:true});
        doc.fillColor('black').text(`${order.shippingAddress.name}`, 420, 200 );
        doc.text(`${order.shippingAddress.street}`, 420, 215);
        doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.postalcode}`, 420, 230);
        doc.text(`${order.shippingAddress.country}`, 420, 245).moveDown(2);

        // Table Header
        doc.fillColor('white').rect(50, doc.y, 500, 20).fill('#333366');
        doc.fillColor('white').fontSize(12).text('Products:', 55, doc.y + 5);
        doc.text('Quantity', 250, 290, doc.y + 5);
        doc.text('Price', 350, 290, doc.y + 5);
        doc.text('Total', 450, 290, doc.y + 5);
        doc.fillColor('black');

         // Table Content
         let positionY = doc.y + 25;
         for(let item of order.products){
            const product = await Product.findById(item.product);
            doc.text(product.name, 55, positionY);
            doc.text(item.quantity.toString(), 270,  positionY);
            doc.text(`$${item.price.toFixed(2)}`, 350,  positionY);
            doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 450,  positionY);
            positionY += 20;
         }
         doc.moveDown(2);

         // Payment Details
         doc.fillColor('#333366').fontSize(12).text('Payment Details:', 50, positionY + 10, {bold:true});
         doc.fillColor('black').fontSize(12).text(`Total Amount: $${order.totalAmount.toFixed(2)}`);
         doc.text(`Payment Status: ${order.paymentInfo.status}`, 50, positionY + 45);

         // Footer
         doc.fillColor('#333366').fontSize(10).text('Thank you for shopping with us!', 50, positionY + 100, {align: 'center'});

         doc.end();
        stream.on('finish',() => resolve(filePath));
        stream.on('error', reject);
    });
};


module.exports = generateInvoice;