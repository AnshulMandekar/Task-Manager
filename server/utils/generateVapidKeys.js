/**
 * Run this script once to generate VAPID keys for web push notifications.
 * Usage: node utils/generateVapidKeys.js
 * Then copy the output into your .env file.
 */
const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('\n🔑 VAPID Keys Generated!\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('');
