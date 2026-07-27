-- Singapore 4D can legitimately repeat the same winning number across
-- different prize slots in one draw (for example, a top prize and Starter).
-- Prize-slot identity is already enforced by the primary key:
--   (revision_id, prize_type, position)
-- Therefore winning_number must not be unique within a revision.

alter table public.fourd_results
  drop constraint if exists fourd_results_revision_id_winning_number_key;
