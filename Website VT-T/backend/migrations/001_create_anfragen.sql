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

create table if not exists visits (
  id serial primary key,
  path text not null,
  ip text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists social_clicks (
  id serial primary key,
  platform text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
