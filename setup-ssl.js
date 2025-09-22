#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔒 SSL Certificate Setup Helper');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found! Please run this from the backend directory.');
    process.exit(1);
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// SSL certificate paths (update these with your actual paths)
const sslConfig = `
# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/phuongthustudio.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/phuongthustudio.com/privkey.pem
HTTPS_ENABLED=true
NODE_ENV=production
`;

// Check if SSL config already exists
if (envContent.includes('SSL_CERT_PATH')) {
    console.log('⚠️  SSL configuration already exists in .env file');
    console.log('Current SSL config:');
    const lines = envContent.split('\n');
    lines.forEach(line => {
        if (line.includes('SSL_') || line.includes('HTTPS_') || line.includes('NODE_ENV')) {
            console.log(`   ${line}`);
        }
    });
} else {
    // Add SSL configuration
    envContent += sslConfig;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ SSL configuration added to .env file');
}

console.log('\n📋 Next Steps:');
console.log('1. Get SSL certificate using one of these methods:');
console.log('   - Let\'s Encrypt: sudo certbot certonly --standalone -d phuongthustudio.com');
console.log('   - Cloudflare: Sign up and enable SSL in dashboard');
console.log('   - Self-signed: See get-ssl-certificate.md for instructions');
console.log('\n2. Update the certificate paths in .env file if needed');
console.log('\n3. Restart your server: npm start');
console.log('\n4. Test HTTPS: https://phuongthustudio.com');

console.log('\n🔧 Current .env configuration:');
console.log('================================');
console.log(fs.readFileSync(envPath, 'utf8'));
