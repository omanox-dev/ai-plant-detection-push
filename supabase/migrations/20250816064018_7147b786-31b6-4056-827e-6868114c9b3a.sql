-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for care reminders (runs every hour)
SELECT cron.schedule(
  'process-care-reminders',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
        url:='https://fkhefzxrsefkujaxmgxp.supabase.co/functions/v1/scheduled-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraGVmenhyc2Vma3VqYXhtZ3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTUyNTYsImV4cCI6MjA3MDczMTI1Nn0.5REzyXJeSHicKEv285DnyIkSLHiSGPuQwyZc5o3p2PU"}'::jsonb,
        body:='{"taskType": "care_reminders"}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job for weather updates (runs twice daily at 6 AM and 6 PM)
SELECT cron.schedule(
  'process-weather-updates',
  '0 6,18 * * *', -- At 6:00 AM and 6:00 PM every day
  $$
  SELECT
    net.http_post(
        url:='https://fkhefzxrsefkujaxmgxp.supabase.co/functions/v1/scheduled-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraGVmenhyc2Vma3VqYXhtZ3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTUyNTYsImV4cCI6MjA3MDczMTI1Nn0.5REzyXJeSHicKEv285DnyIkSLHiSGPuQwyZc5o3p2PU"}'::jsonb,
        body:='{"taskType": "weather_updates"}'::jsonb
    ) as request_id;
  $$
);