-- Store a display-name snapshot of the authenticated Credit Analyst account
-- that submitted each new loan. Historical rows remain null because the
-- submitting account was not previously recorded.

alter table public.loans
  add column if not exists submitted_by_name text;

comment on column public.loans.submitted_by_name is
  'Display-name snapshot of the Credit Analyst account that submitted the application.';

notify pgrst, 'reload schema';
