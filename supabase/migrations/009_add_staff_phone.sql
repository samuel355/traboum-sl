-- Staff contact numbers are application profile data, separate from Clerk's
-- phone authentication feature, which is not enabled for this instance.
alter table public.tsl_staff
  add column if not exists phone text;
