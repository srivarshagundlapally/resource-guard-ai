create or replace function public.get_dashboard_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  now_ts timestamptz;
  today_start timestamptz;
  week_start timestamptz;
  result jsonb;
begin
  select greatest(
    coalesce((select max(timestamp) from water_consumption), 'epoch'::timestamptz),
    coalesce((select max(timestamp) from electricity_consumption), 'epoch'::timestamptz),
    coalesce((select max(timestamp) from internet_consumption), 'epoch'::timestamptz)
  ) into now_ts;

  today_start := date_trunc('day', now_ts);
  week_start := date_trunc('day', now_ts - interval '6 days');

  with u as (
    select 'water'::text as k, timestamp as ts, building_id, water_usage_liters::numeric as v, anomaly_label
      from water_consumption where timestamp >= least(week_start, today_start - interval '1 day')
    union all
    select 'electricity', timestamp, building_id, electricity_usage_kwh::numeric, anomaly_label
      from electricity_consumption where timestamp >= least(week_start, today_start - interval '1 day')
    union all
    select 'internet', timestamp, building_id, internet_usage_gb::numeric, anomaly_label
      from internet_consumption where timestamp >= least(week_start, today_start - interval '1 day')
  )
  select jsonb_build_object(
    'now', now_ts,
    'today', coalesce((select jsonb_object_agg(k, s) from (
        select k, round(sum(v), 2) s from u where ts >= today_start group by k) t), '{}'::jsonb),
    'yesterday', coalesce((select jsonb_object_agg(k, s) from (
        select k, round(sum(v), 2) s from u
        where ts >= today_start - interval '1 day' and ts < today_start group by k) t), '{}'::jsonb),
    'hourly', coalesce((select jsonb_agg(jsonb_build_object(
        'hour', h, 'water', w, 'electricity', e, 'internet', i) order by h) from (
        select date_trunc('hour', ts) h,
          round(coalesce(sum(v) filter (where k = 'water'), 0), 2) w,
          round(coalesce(sum(v) filter (where k = 'electricity'), 0), 2) e,
          round(coalesce(sum(v) filter (where k = 'internet'), 0), 2) i
        from u where ts >= now_ts - interval '24 hours' group by 1) q), '[]'::jsonb),
    'per_building', coalesce((select jsonb_agg(jsonb_build_object(
        'building_id', building_id, 'water', w, 'electricity', e, 'internet', i) order by building_id) from (
        select building_id,
          round(coalesce(sum(v) filter (where k = 'water'), 0), 2) w,
          round(coalesce(sum(v) filter (where k = 'electricity'), 0), 2) e,
          round(coalesce(sum(v) filter (where k = 'internet'), 0), 2) i
        from u where ts >= today_start group by 1) q), '[]'::jsonb),
    'heatmap', coalesce((select jsonb_agg(jsonb_build_object(
        'building_id', building_id, 'date', d, 'value', val, 'has_anomaly', ha)) from (
        select building_id, date_trunc('day', ts) d,
          round(sum(v), 2) val,
          bool_or(anomaly_label is not null and anomaly_label <> 'normal') ha
        from u where k = 'water' and ts >= week_start group by 1, 2) q), '[]'::jsonb)
  ) into result from u limit 1;

  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.get_dashboard_data() to authenticated;
