# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name and database password
3. Wait for the project to be created

## 2. Set up Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL to create tables, indexes, and policies

## 3. Get Your Credentials

1. Go to Project Settings > API
2. Copy your Project URL and anon public key
3. Copy your service_role secret key (for server-side operations)

## 4. Update Environment Variables

Update your `.env.local` file with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 5. Test the Setup

1. Start your development server: `npm run dev`
2. Try creating a new scan
3. Check your Supabase dashboard to see the data being stored

## 6. Optional: Enable Real-time

Real-time updates are already configured in the code. To enable them:

1. Go to Database > Replication in your Supabase dashboard
2. Enable replication for the `scans` table
3. The frontend will automatically receive real-time updates when scan status changes

## Database Structure

### Tables Created:

- **users**: User accounts with plan information
- **scans**: Accessibility scan results with full JSONB storage

### Features Enabled:

- Row Level Security (RLS) for data protection
- Real-time subscriptions for live updates
- Automatic timestamp management
- Proper indexing for performance
- Anonymous scan support (user_id can be null)

## Next Steps

Once set up, you can:

- Add user authentication
- Create user dashboards
- Add scan history
- Implement plan-based limitations
- Add analytics and reporting
