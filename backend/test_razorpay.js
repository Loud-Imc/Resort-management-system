const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: 'rzp_test_dummy',
    key_secret: 'dummy_secret'
});
console.log('qrCode:', !!razorpay.qrCode);
console.log('qr_code:', !!razorpay.qr_code);
console.log('Properties:', Object.keys(razorpay));
