-- Keep this separate: PostgreSQL requires a commit before the new enum value is used.
alter type public.membership_role add value if not exists 'PARENT';
