-- Assign human-readable loan references atomically in PostgreSQL.
-- Existing loan references are preserved. The sequence resumes after the
-- highest numeric LN-* reference already stored in the loans table.

create sequence if not exists public.loan_id_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

do $$
declare
  next_loan_number bigint;
begin
  select coalesce(
    max(substring(loan_id from '^LN-([0-9]+)$')::bigint),
    0
  ) + 1
  into next_loan_number
  from public.loans
  where loan_id ~ '^LN-[0-9]+$';

  perform setval('public.loan_id_seq', next_loan_number, false);
end
$$;

alter table public.loans
  alter column loan_id set default (
    'LN-' || lpad(nextval('public.loan_id_seq')::text, 8, '0')
  );

create unique index if not exists loans_loan_id_key
  on public.loans (loan_id);

revoke all on sequence public.loan_id_seq from anon;
grant usage, select on sequence public.loan_id_seq to authenticated, service_role;
