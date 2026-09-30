SELECT jsonb_build_object(
    'source_apps', coalesce((SELECT jsonb_agg(s) FROM public.source_apps s), '[]'),
    'mapalab_api_keys', coalesce((SELECT jsonb_agg(k) FROM public.mapalab_api_keys k), '[]'),
    'mapalab_api_keys_embeds', coalesce((
        SELECT jsonb_agg(to_jsonb(e) || jsonb_build_object('key_prefix', k.key_prefix))
          FROM public.mapalab_api_keys_embeds e
          JOIN public.mapalab_api_keys k ON k.id = e.api_key_id
    ), '[]')
);
