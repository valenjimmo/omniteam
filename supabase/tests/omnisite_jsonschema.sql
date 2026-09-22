-- Real pg_jsonschema checks. Run only against local Supabase, not the PGlite shim.
begin;
do $$
declare
  valid jsonb := $json${
    "schemaVersion":3,
    "teamId":"00000000-0000-4000-8000-000000000001",
    "siteId":"00000000-0000-4000-8000-000000000002",
    "slug":"sample",
    "siteName":"Sample",
    "layout":"classic",
    "theme":{"primary":"#164e63","secondary":"#0e7490","accent":"#f59e0b","surface":"light"},
    "logoPath":null,
    "settings":{"typography":"sans","faviconPath":null,"socialImagePath":null,"seoTitle":"","seoDescription":""},
    "pages":[{"slug":"home","title":"Home","seoDescription":"","navOrder":0,"visible":true,"sections":[
      {"type":"richText","heading":"Story","blocks":[{"type":"paragraph","children":[{"text":"Safe text","marks":["bold"],"href":"/contact"}]}]},
      {"type":"newsList","heading":"News","items":[{"title":"Update","summary":"Public news","publishedDate":"2026-09-22","href":"https://example.org/news"}]},
      {"type":"eventsList","heading":"Events","items":[{"title":"Open house","summary":"Public event","date":"2026-10-01","time":"18:00","location":"Pool","href":"/contact"}]}
    ]}]
  }$json$::jsonb;
begin
  if not public.os_valid_snapshot(valid) then raise exception 'valid v3 content failed pg_jsonschema'; end if;
  if public.os_valid_snapshot(jsonb_set(valid,'{pages,0,sections,0,blocks,0,children,0,marks}','["script"]')) then
    raise exception 'unknown rich-text mark passed pg_jsonschema';
  end if;
  if public.os_valid_snapshot(jsonb_set(valid,'{pages,0,sections,1,items,0,publishedDate}','"2026/09/22"')) then
    raise exception 'malformed news date passed pg_jsonschema';
  end if;
end;
$$;
rollback;
