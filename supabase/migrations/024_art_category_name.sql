-- Event category display name: "Arts" -> "Art" (slug stays 'arts').
update public.event_categories set name = 'Art' where slug = 'arts';
