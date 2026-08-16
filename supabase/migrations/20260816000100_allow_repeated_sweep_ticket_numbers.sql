-- Singapore Sweep can legitimately repeat the same ticket number within a prize tier.
-- Position is already the canonical row identity inside a revision/tier, so include
-- it in the secondary uniqueness check instead of rejecting repeated ticket numbers.

drop index if exists public.sweep_results_entry_idx;

create unique index sweep_results_entry_idx on public.sweep_results
  (revision_id, tier_code, position, ticket_number, coalesce(series, ''), coalesce(entry_suffix, ''));
