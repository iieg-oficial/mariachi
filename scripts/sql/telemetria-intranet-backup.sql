CREATE FUNCTION pg_temp.filas(tabla text) RETURNS jsonb
LANGUAGE plpgsql AS $f$
DECLARE
    r jsonb;
BEGIN
    EXECUTE format('SELECT coalesce(jsonb_agg(x), ''[]'') FROM huachicol.%I x WHERE app = %L', tabla, 'intranet') INTO r;
    RETURN r;
END
$f$;

SELECT coalesce(jsonb_object_agg(table_name, pg_temp.filas(table_name)), '{}')
  FROM information_schema.columns
 WHERE table_schema = 'huachicol' AND column_name = 'app';
