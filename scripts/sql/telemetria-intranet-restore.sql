CREATE FUNCTION pg_temp.agregar(tabla regclass, filas jsonb) RETURNS integer
LANGUAGE plpgsql AS $f$
DECLARE
    cols text[] := pg_temp.columnas(tabla, filas);
    n integer;
BEGIN
    IF jsonb_array_length(filas) = 0 THEN
        RETURN 0;
    END IF;
    EXECUTE format(
        'INSERT INTO %s (%s) SELECT %s FROM jsonb_populate_recordset(null::%s, $1) r EXCEPT SELECT %s FROM %s WHERE app = %L ON CONFLICT DO NOTHING',
        tabla,
        pg_temp.lista(cols, '%I'),
        (SELECT string_agg(pg_temp.valor(c), ', ') FROM unnest(cols) c),
        tabla,
        pg_temp.lista(cols, '%I'),
        tabla,
        'intranet'
    ) USING filas;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END
$f$;

SELECT t.tabla || ' ' || pg_temp.agregar(format('huachicol.%I', t.tabla)::regclass, t.filas)
  FROM _carga, jsonb_each(datos) AS t(tabla, filas)
 WHERE to_regclass(format('huachicol.%I', t.tabla)) IS NOT NULL
 ORDER BY t.tabla <> 'sessions', t.tabla;
