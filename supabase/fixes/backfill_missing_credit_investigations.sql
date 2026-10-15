-- Repair historical claimed loans that were claimed before an investigation
-- row was successfully created. Existing investigations are left unchanged.
insert into public.loan_credit_investigations (
  loan_id,
  credit_investigator_id,
  status
)
select
  loan.id,
  loan.claimed_by,
  'pending'
from public.loans as loan
where loan.claim_status = 'claimed'
  and loan.claimed_by is not null
  and not exists (
    select 1
    from public.loan_credit_investigations as investigation
    where investigation.loan_id = loan.id
  )
on conflict (loan_id) do nothing;

-- Verify the investigation needed by the reported rejection.
select
  investigation.id,
  investigation.loan_id,
  investigation.credit_investigator_id,
  investigation.status,
  investigation.investigation_report_status
from public.loan_credit_investigations as investigation
where investigation.loan_id =
  'b858709c-eed9-4e14-9de5-339fd0e6f9ac'::uuid;
