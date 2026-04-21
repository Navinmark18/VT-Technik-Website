create table if not exists anfragen (
  id integer primary key autoincrement,
  vorname text not null,
  nachname text not null,
  email text not null,
  telefon text,
  eventtyp text not null,
  datum text not null,
  ort text,
  gaeste integer,
  leistungen text,
  nachricht text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists visits (
  id integer primary key autoincrement,
  path text not null,
  ip text,
  user_agent text,
  referrer text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists social_clicks (
  id integer primary key autoincrement,
  platform text not null,
  ip text,
  user_agent text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
