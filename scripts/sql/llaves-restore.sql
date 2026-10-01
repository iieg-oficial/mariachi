CREATE FUNCTION pg_temp.agregar_faltantes(tabla regclass, filas jsonb, conflicto text) RETURNS integer
LANGUAGE plpgsql AS $f$
DECLARE
    cols text[] := pg_temp.columnas(tabla, filas);
    n integer;
BEGIN
    IF jsonb_array_length(filas) = 0 THEN
        RETURN 0;
    END IF;
    EXECUTE format(
        'INSERT INTO %s (%s) SELECT %s FROM jsonb_populate_recordset(null::%s, $1) r ON CONFLICT (%s) DO NOTHING',
        tabla,
        pg_temp.lista(cols, '%I'),
        (SELECT string_agg(pg_temp.valor(c), ', ') FROM unnest(cols) c),
        tabla,
        conflicto
    ) USING filas;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END
$f$;

SELECT 'source_apps ' || pg_temp.agregar_faltantes('public.source_apps', datos -> 'source_apps', 'slug') FROM _carga;
SELECT 'mapalab_api_keys ' || pg_temp.agregar_faltantes('public.mapalab_api_keys', datos -> 'mapalab_api_keys', 'key_prefix') FROM _carga;
SELECT 'mapalab_api_keys_embeds ' || pg_temp.agregar_faltantes(
    'public.mapalab_api_keys_embeds',
    coalesce((
        SELECT jsonb_agg((e - 'key_prefix') || jsonb_build_object('api_key_id', k.id))
          FROM jsonb_array_elements(datos -> 'mapalab_api_keys_embeds') e
          JOIN public.mapalab_api_keys k ON k.key_prefix = e ->> 'key_prefix'
    ), '[]'),
    'api_key_id, share_id'
) FROM _carga;
