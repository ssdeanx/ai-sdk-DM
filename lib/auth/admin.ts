/**
 * Admin user management utilities
 * This module provides functions for creating and managing admin users
 */

import { getSupabaseClient } from '@/lib/memory/supabase'
import { getDrizzleClient } from '@/lib/memory/supabase'
import { users } from '@/db/supabase/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

/**
 * Create or update the admin user
 * @returns The admin user ID
 */
export async function ensureAdminUser() {
  const email = 'owner@deanmachines.com'
  const password = 'admin!'
  const name = 'Admin'
  
  try {
    // Try using Drizzle first
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient()
        
        // Check if admin user exists
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
        
        if (existingUsers.length > 0) {
          console.log('Admin user already exists in database')
          return existingUsers[0].id
        }
        
        // Create admin user in database
        const [newUser] = await db
          .insert(users)
          .values({
            id: uuidv4(),
            email,
            name,
            role: 'admin',
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning()
        
        console.log('Admin user created in database')
        
        // Now create the auth user
        const supabase = getSupabaseClient()
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role: 'admin' },
        })
        
        if (authError) {
          console.error('Error creating admin auth user:', authError)
          return newUser.id
        }
        
        console.log('Admin auth user created')
        return newUser.id
      } catch (drizzleError) {
        console.error('Error using Drizzle, falling back to Supabase:', drizzleError)
        // Continue to Supabase fallback
      }
    }
    
    // Fall back to Supabase client
    const supabase = getSupabaseClient()
    
    // Check if user exists in auth
    let existingAuthUser = null;
    // Attempt to list users to find if the admin user already exists by email.
    // Set a high perPage limit; consider proper pagination if user base is very large.
    const { data: usersListResponse, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
      console.error('Error listing users when checking for admin user:', listError);
      // If listing fails, we cannot confirm existence. Proceed to attempt creation as a fallback.
    } else if (usersListResponse && usersListResponse.users) {
      existingAuthUser = usersListResponse.users.find(u => u.email === email);
    }
    
    if (existingAuthUser) {
      console.log('Admin user already exists in auth');
      
      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { password, email_confirm: true }
      );
      
      if (updateError) {
        console.error('Error updating admin password:', updateError);
      } else {
        console.log('Admin password updated');
      }
      
      return existingAuthUser.id;
    }
    
    // Create new admin user
    const { data: newUserResponse, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'admin' },
    });
    
    if (createError) {
      console.error('Error creating admin user:', createError);
      throw createError;
    }

    if (!newUserResponse || !newUserResponse.user) {
      console.error('Failed to create admin user or user data not returned.');
      throw new Error('Failed to create admin user or user data not returned.');
    }
    
    console.log('Admin user created successfully');
    return newUserResponse.user.id;
  } catch (error) {
    console.error('Unexpected error creating admin user:', error)
    throw error
  }
}

/**
 * Check if a user is an admin
 * @param userId User ID to check
 * @returns True if the user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // Try using Drizzle first
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient()
        
        // Get user from database
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
        
        if (existingUsers.length > 0) {
          return existingUsers[0].role === 'admin'
        }
        
        return false
      } catch (drizzleError) {
        console.error('Error using Drizzle, falling back to Supabase:', drizzleError)
        // Continue to Supabase fallback
      }
    }
    
    // Fall back to Supabase client
    const supabase = getSupabaseClient()
    
    // Get user from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !userData) {
      console.error('Error getting user:', userError)
      return false
    }
    
    // Check if user is admin
    return userData.user.user_metadata?.role === 'admin' || userData.user.email === 'owner@deanmachines.com'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}
