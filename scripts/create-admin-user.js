// @ts-nocheck
// Script to create an admin user in Supabase// Run with: node scripts/create-admin-user.js

require('dotenv').config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createAdminUser() {
  try {
    const email = 'owner@deanmachines.com';
    const password = 'admin!';

    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing user:', checkError);
      return;
    }

    if (existingUsers) {
      console.log('Admin user already exists. Updating password...');

      // Update the user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUsers.id,
        { password }
      );

      if (updateError) {
        console.error('Error updating admin password:', updateError);
        return;
      }

      console.log('Admin password updated successfully!');
      return;
    }

    // Create a new admin user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Admin',
          role: 'admin',
        },
      },
    });

    if (error) {
      console.error('Error creating admin user:', error);
      return;
    }

    console.log('Admin user created successfully!');
    console.log('User ID:', data.user.id);

    // Set the user as confirmed (if email confirmation is enabled)
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      data.user.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('Error confirming admin user:', confirmError);
      return;
    }

    console.log('Admin user confirmed successfully!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser();
