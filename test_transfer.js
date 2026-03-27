
const http = require('http');

const data = JSON.stringify({
    itemName: "TEST ITEM",
    quantity: 1,
    from: "CENTRAL MESS",
    to: "Fourth Corner",
    status: 'Pending'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/transfers',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseData);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
