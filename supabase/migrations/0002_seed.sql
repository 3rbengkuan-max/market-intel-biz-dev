-- Seed demo data for Market Intel & Biz Dev (MP Biomedicals BD team).
-- Idempotent: fixed UUIDs + on conflict do nothing. priority_score values
-- follow the rule-based scoring: base 50, +20 threat, +15 confidence>0.8,
-- +10 source_url present, +5 per linked action, capped at 100.

insert into public.intel_items
  (id, title, type, description, source_url, priority_score, status, recommendation, confidence, source, review_status)
values
  ('11111111-1111-1111-1111-111111111111',
   'Thermo Fisher acquires specialty antibody supplier Ximbio',
   'threat',
   'Thermo Fisher announced acquisition of a specialty antibody supplier, consolidating the research-use antibody supply chain and squeezing independent reagent vendors on catalog breadth and pricing.',
   'https://www.example-biotechnews.com/thermo-antibody-acquisition',
   100, 'triaged',
   'Defend key accounts: bundle our antibody + reagent lines with faster lead times; assign product specialist to map overlapping SKUs within 2 weeks.',
   0.85, 'manual', 'reviewed'),

  ('22222222-2222-2222-2222-222222222222',
   'EU eases approval timeline for research-use cell therapy reagents',
   'opportunity',
   'Updated EU guidance shortens the approval pathway for research-use-only cell therapy reagents, opening a faster route to market for compliant suppliers across the EU.',
   'https://www.example-biotechnews.com/eu-reagent-deregulation',
   80, 'acting',
   'Fast-track 3 existing GMP-adjacent products for EU distribution; assign BD to line up an EU distributor and product specialist for compliance review.',
   0.82, 'manual', 'reviewed'),

  ('33333333-3333-3333-3333-333333333333',
   'NIH FY25 grant surge boosts demand for antibody & assay kits',
   'opportunity',
   'A jump in NIH funding for immunology and antibody research points to rising academic demand for validated antibodies and ELISA/assay kits over the next two funding cycles.',
   'https://www.example-biotechnews.com/nih-fy25-funding',
   60, 'new',
   'Target top NIH-funded labs with an academic bundle and validated-antibody promo; assign sales to build the target account list.',
   0.70, 'manual', 'reviewed'),

  ('44444444-4444-4444-4444-444444444444',
   'Biosimilar price pressure compresses reagent margins in Q3',
   'threat',
   'Aggressive biosimilar pricing is pushing downstream customers to demand lower reagent costs, threatening gross margin on high-volume catalog lines this quarter.',
   null,
   75, 'new',
   'Protect margin with tiered volume pricing and a value-add service wrap; assign sales to model the margin impact before renewals.',
   0.60, 'manual', 'reviewed'),

  ('55555555-5555-5555-5555-555555555555',
   'APAC distributor seeking exclusive reagent partnership',
   'opportunity',
   'A mid-size APAC distributor is actively seeking an exclusive reagent supply partner for the Southeast Asia research market, signaling a fast channel-expansion opportunity.',
   'https://www.example-biotechnews.com/apac-distributor-rfp',
   75, 'new',
   'Open partnership talks and scope an exclusive SEA distribution deal; assign BD director to lead and product specialist to define the catalog scope.',
   0.90, 'manual', 'reviewed')
on conflict (id) do nothing;

insert into public.actions
  (id, intel_item_id, title, description, action_type, status, assignee_name, assignee_role, due_date)
values
  ('a1111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   'Monitor Thermo integration & affected accounts',
   'Track the acquisition close and flag any of our accounts likely to be cross-sold; report back weekly.',
   'monitor', 'in_progress', 'Priya Nair', 'product specialist', current_date + 14),

  ('a2222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222',
   'Line up EU distributor for research-use reagents',
   'Shortlist EU distributors and open first-contact conversations for the fast-tracked product set.',
   'develop', 'planned', 'Marco Bianchi', 'BD', current_date + 21),

  ('a4444444-4444-4444-4444-444444444444',
   '44444444-4444-4444-4444-444444444444',
   'Model Q3 margin impact of biosimilar pricing',
   'Build a margin sensitivity model for top-volume catalog lines ahead of Q3 renewals.',
   'mitigate', 'draft', 'Sara Lindqvist', 'sales', current_date + 10)
on conflict (id) do nothing;
