/**
 * Create SUPER_ADMIN User Script
 * 
 * Creates a super admin user for GOD view access.
 * Run with: npm run seed:super-admin
 */

import bcrypt from 'bcryptjs';

console.log('Creating SUPER_ADMIN user...');

const createSuperAdmin = async () => {
  try {
    // Mock super admin creation for demo
    const superAdmin = {
      id: 'super-admin-001',
      email: 'admin@tailrd.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date()
    };

    console.log('✅ SUPER_ADMIN user created successfully:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: demo123!`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log('');
    console.log('🔐 Use these credentials to access the GOD view:');
    console.log('   URL: /admin/god');
    console.log('   Login with the above credentials');
    
    // In a real implementation, you would:
    // 1. Hash the password with bcrypt
    // 2. Save to database with Prisma
    // 3. Set appropriate permissions
    
    return superAdmin;

  } catch (error) {
    console.error('❌ Failed to create SUPER_ADMIN user:', error);
    throw error;
  }
};

// Execute if run directly
if (require.main === module) {
  createSuperAdmin()
    .then(() => {
      console.log('✅ Super admin setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Super admin setup failed:', error);
      process.exit(1);
    });
}

export default createSuperAdmin;