create or replace function public.credit_investigation_rejected(
  p_loan_id uuid,
  p_stage text,
  p_reason_for_rejection text,
  p_rejection_additional_details text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_stage text := lower(btrim(p_stage));
  v_loan_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if v_stage is null or v_stage not in (
    'investigation report',
    'cashflow analysis',
    'collateral analysis',
    'disclosure statement'
  ) then
    raise exception
      'Invalid stage. Use investigation report, cashflow analysis, collateral analysis, or disclosure statement';
  end if;

  if nullif(btrim(p_reason_for_rejection), '') is null then
    raise exception 'Reason for rejection is required';
  end if;

  update public.loan_credit_investigations as investigation
  set investigation_report_status = case
        when v_stage = 'investigation report' then 'rejected'
        else investigation.investigation_report_status
      end,
      cashflow_analysis_status = case
        when v_stage = 'cashflow analysis' then 'rejected'
        else investigation.cashflow_analysis_status
      end,
      collateral_analysis_status = case
        when v_stage = 'collateral analysis' then 'rejected'
        else investigation.collateral_analysis_status
      end,
      disclosure_statement_status = case
        when v_stage = 'disclosure statement' then 'rejected'
        else investigation.disclosure_statement_status
      end
  where investigation.loan_id = p_loan_id
    and investigation.credit_investigator_id = v_user_id
  returning investigation.loan_id into v_loan_id;

  if not found then
    raise exception
      'Investigation for loan % was not found, is not accessible, or is assigned to another investigator',
      p_loan_id;
  end if;

  update public.loans as loan
  set status = 'rejected',
      reason_for_rejection = btrim(p_reason_for_rejection),
      rejection_additional_details =
        nullif(btrim(p_rejection_additional_details), '')
  where loan.id = v_loan_id
    and loan.claimed_by = v_user_id
  returning loan.id into v_loan_id;

  if not found then
    raise exception
      'Loan % was not found, is not accessible, or is not claimed by you',
      p_loan_id;
  end if;

  return v_loan_id;
end;
$function$;
