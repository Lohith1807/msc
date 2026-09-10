/**
 * One-time migration: Update specific user roles
 *  - lohithreddy1819@gmail.com  → dev
 *  - lohithreddy18april@gmail.com → admin
 *
 * Run: node src/scripts/migrateRoles.js
 */

import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

async function migrateRoles() {
  await connectDB();
  console.log('🔄 Running role migration...\n');

  const updates = [
    { email: 'lohithreddy1819@gmail.com',    newRole: 'dev',   reason: 'Primary dev account' },
    { email: 'lohithreddy18april@gmail.com', newRole: 'admin', reason: 'Psychiatrist → Admin' },
  ];

  for (const { email, newRole, reason } of updates) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.warn(`⚠️  User not found: ${email}`);
      continue;
    }
    const oldRole = user.role;
    user.role = newRole;
    await user.save();
    console.log(`✅  ${email}  ${oldRole} → ${newRole}  (${reason})`);
  }

  console.log('\n✅ Migration complete.');
  process.exit(0);
}

migrateRoles().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
