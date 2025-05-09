# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth authentication for your DeanmachinesAI application.

## 1. Create a GitHub OAuth App

1. Go to your GitHub account settings
2. Navigate to **Developer settings** > **OAuth Apps** > **New OAuth App**
3. Fill in the following details:
   - **Application name**: DeanmachinesAI (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for development) or your production URL
   - **Application description**: (Optional) A description of your application
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github` (for development) or your production callback URL

4. Click **Register application**
5. On the next page, note your **Client ID**
6. Click **Generate a new client secret** and note the generated **Client Secret**

## 2. Configure Supabase Auth

### For Local Development

1. Open your Supabase project dashboard
2. Go to **Authentication** > **Providers**
3. Find **GitHub** in the list and click **Edit**
4. Enable the provider by toggling the switch
5. Enter the **Client ID** and **Client Secret** from your GitHub OAuth App
6. Save the changes

### For Production

1. Follow the same steps as for local development, but use your production URLs
2. Make sure to update the **Authorization callback URL** in your GitHub OAuth App settings to match your production URL

## 3. Update Environment Variables

Make sure your `.env.local` file includes the Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. Configure Redirect URLs

In your Supabase dashboard:

1. Go to **Authentication** > **URL Configuration**
2. Set the **Site URL** to your application's base URL (e.g., `http://localhost:3000` for development)
3. Add any additional redirect URLs under **Redirect URLs**
4. Save the changes

## 5. Testing the Integration

1. Start your development server
2. Navigate to `/auth/signin` in your application
3. Click the "Sign in with GitHub" button
4. You should be redirected to GitHub for authentication
5. After authenticating, you should be redirected back to your application

## Troubleshooting

### Common Issues

1. **Callback URL Mismatch**: Ensure the callback URL in your GitHub OAuth App settings exactly matches the URL in your application
2. **Incorrect Client ID or Secret**: Double-check that you've entered the correct values in Supabase
3. **CORS Issues**: Make sure your Supabase site URL and redirect URLs are correctly configured
4. **Missing Scopes**: The default scopes (`read:user` and `user:email`) should be sufficient for basic authentication

### Debug Logs

If you encounter issues, check:

1. Browser console for client-side errors
2. Server logs for backend errors
3. Supabase authentication logs in the Supabase dashboard

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [Next.js Authentication Documentation](https://nextjs.org/docs/authentication)
