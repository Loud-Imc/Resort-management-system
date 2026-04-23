const pdfmake = require('pdfmake');
console.log('pdfmake type:', typeof pdfmake);
console.log('pdfmake instance keys:', Object.keys(pdfmake));

function logPrototype(obj, name) {
    const proto = Object.getPrototypeOf(obj);
    if (proto) {
        console.log(`${name} prototype keys:`, Object.getOwnPropertyNames(proto));
        logPrototype(proto, `${name} parent`);
    }
}

logPrototype(pdfmake, 'pdfmake');

if (typeof pdfmake.setUrlAccessPolicy === 'function') {
    console.log('setUrlAccessPolicy is a function on instance');
} else {
    console.log('setUrlAccessPolicy is NOT a function on instance');
}
