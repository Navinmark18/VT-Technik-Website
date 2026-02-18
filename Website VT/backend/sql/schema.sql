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
