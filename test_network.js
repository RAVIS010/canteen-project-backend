const net = require('net');
const client = new net.Socket();
const host = 'cluster0.y3mns.mongodb.net';
const port = 27017;

console.log(`Checking network connectivity to ${host}:${port}...`);

client.setTimeout(5000);
client.connect(port, host, function () {
    console.log('✅ Network Connection Successful! (Port 27017 is open)');
    client.destroy();
});

client.on('error', function (err) {
    console.log('❌ Network Connection Failed: ' + err.message);
});

client.on('timeout', function () {
    console.log('❌ Network Connection Timed Out. (Likely an IP Whitelist issue)');
    client.destroy();
});
