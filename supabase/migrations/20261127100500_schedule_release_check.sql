-- ============================================================================
-- Run the artist release check every 30 minutes from the database, instead of
-- relying on GitHub Actions' (heavily delayed) cron.
--
-- pg_cron fires pg_net, which POSTs to the site's /api/cron/check-releases
-- endpoint with the bearer token stored in Vault as
-- `release_check_cron_secret`. The same value is the CRON_SECRET env var in
-- Vercel. To rotate: update both, e.g.
--   select vault.update_secret(id, '<new>') from vault.secrets
--   where name = 'release_check_cron_secret';
-- ============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('check-artist-releases')
where exists (select 1 from cron.job where jobname = 'check-artist-releases');

select cron.schedule(
  'check-artist-releases',
  '*/30 * * * *',
  $job$
  select net.http_post(
    url := 'https://bazcario-album-archive.vercel.app/api/cron/check-releases',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'release_check_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
