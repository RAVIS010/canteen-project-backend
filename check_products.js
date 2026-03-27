
const http = require('http');

http.get('http://localhost/api/products', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const products = JSON.parse(data);
            console.log('Total products:', products.length);
            console.log('Unique locations:', [...new Set(products.map(p => p.location))]);
            if (products.length > 0) {
                console.log('First 3 items:', JSON.stringify(products.slice(0, 3), null, 2));
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
            console.log('Raw data:', data.slice(0, 200));
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
