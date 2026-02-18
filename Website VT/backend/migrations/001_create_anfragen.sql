create table if not exists anfragen (
  id serial primary key,
  vorname text not null,
  nachname text not null,
  email text not null,
  telefon text,
  eventtyp text not null,
  datum date not null,
  ort text,
  gaeste integer,
  leistungen text,
  nachricht text not null,
  created_at timestamptz not null default now()
);
