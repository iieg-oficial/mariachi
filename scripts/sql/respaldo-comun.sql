CREATE FUNCTION pg_temp.columnas(tabla regclass, filas jsonb) RETURNS text[]
LANGUAGE sql AS $f$
    SELECT coalesce(array_agg(a.attname::text ORDER BY a.attnum), ARRAY[]::text[])
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = tabla AND a.attnum > 0 AND NOT a.attisdropped
       AND a.attname IN (SELECT jsonb_object_keys(filas -> 0))
       AND coalesce(pg_get_expr(d.adbin, d.adrelid), '') NOT LIKE 'nextval%'
$f$;

CREATE FUNCTION pg_temp.valor(columna text) RETURNS text
LANGUAGE sql AS $f$
    SELECT CASE
        WHEN columna LIKE '%\_user\_id' THEN format('(SELECT u.id FROM public.usuarios u WHERE u.id = r.%I)', columna)
        WHEN columna = 'api_key_id' THEN format('(SELECT k.id FROM public.mapalab_api_keys k WHERE k.id = r.%I)', columna)
        ELSE format('r.%I', columna)
    END
$f$;

CREATE FUNCTION pg_temp.lista(cols text[], plantilla text) RETURNS text
LANGUAGE sql AS $f$
    SELECT string_agg(format(plantilla, c, c), ', ') FROM unnest(cols) c
$f$;
