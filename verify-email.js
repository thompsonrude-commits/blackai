const admin = require('firebase-admin');

// Initialize with your service account
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'jatalk-1274b'
});

async function verifyEmail() {
  try {
    const userEmail = 'obosathompsons@gmail.com';
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(userEmail);
    
    // Update user to set email as verified
    await admin.auth().updateUser(user.uid, {
      emailVerified: true
    });
    
    console.log(`✅ Email verified for ${userEmail}`);
    console.log(`User UID: ${user.uid}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

verifyEmail();
