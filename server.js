/**
 * Simple HTTPS server for local camera testing
 * Requires certificate files (localhost+2.pem and localhost+2-key.pem)
 * 
 * Setup with mkcert:
 *   brew install mkcert
 *   mkcert -install
 *   mkcert localhost 127.0.0.1 ::1
 * 
 * Or generate self-signed certificate:
 *   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
 * 
 * Usage:
 *   npm install
 *   npm start
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 8443;

// Serve static files
app.use(express.static(__dirname));

// Check for certificate files
let sslOptions;

try {
    // Try mkcert certificates first
    if (fs.existsSync('localhost+2.pem') && fs.existsSync('localhost+2-key.pem')) {
        sslOptions = {
            key: fs.readFileSync('localhost+2-key.pem'),
            cert: fs.readFileSync('localhost+2.pem')
        };
        console.log('✅ Using mkcert certificates');
    } 
    // Try standard cert.pem/key.pem
    else if (fs.existsSync('cert.pem') && fs.existsSync('key.pem')) {
        sslOptions = {
            key: fs.readFileSync('key.pem'),
            cert: fs.readFileSync('cert.pem')
        };
        console.log('✅ Using standard certificates');
    } 
    else {
        throw new Error('Certificate files not found');
    }
} catch (err) {
    console.error('❌ Certificate files not found!');
    console.log('\n📝 Generate them with one of these methods:');
    console.log('\n1. Using mkcert (recommended):');
    console.log('   brew install mkcert');
    console.log('   mkcert -install');
    console.log('   mkcert localhost 127.0.0.1 ::1');
    console.log('\n2. Using OpenSSL (self-signed):');
    console.log('   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
    process.exit(1);
}

// Create HTTPS server
const server = https.createServer(sslOptions, app);

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n✅ HTTPS Server Started!');
    console.log('\n📱 Access on this computer:');
    console.log(`   https://localhost:${PORT}`);
    console.log('\n📱 Access on mobile (same WiFi):');
    console.log('   Find your local IP:');
    console.log('   macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1');
    console.log('   Windows: ipconfig');
    console.log(`   Then use: https://YOUR_LOCAL_IP:${PORT}`);
    console.log('\n⚠️  You may see a security warning (self-signed cert) - click "Advanced" and proceed');
    console.log('\n🛑 Press Ctrl+C to stop\n');
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log('Try killing the process or use a different port');
    } else {
        console.error('❌ Server error:', err);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n✅ Server shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
