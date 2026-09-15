-- Elige Tu Vida: perfiles, roles y políticas RLS.
-- Ejecuta este archivo completo en Supabase Dashboard > SQL Editor.
-- No incluye claves secretas ni service_role: el navegador solo debe usar la anon/publishable key.

-- 1. Perfil público vinculado de forma segura al usuario de Auth.
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  colegio text,
  rol text not null default 'User',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidad con la tabla perfiles que ya consume login.html.
alter table public.perfiles add column if not exists nombre text;
alter table public.perfiles add column if not exists colegio text;
alter table public.perfiles add column if not exists rol text;
alter table public.perfiles add column if not exists created_at timestamptz not null default now();
alter table public.perfiles add column if not exists updated_at timestamptz not null default now();
alter table public.perfiles alter column rol set default 'User';
update public.perfiles set rol = 'User' where rol is null;
alter table public.perfiles alter column rol set not null;
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('User', 'Admin'));

-- La vista de panel usa la fecha. Esta operación conserva los registros existentes.
alter table public.contactos add column if not exists created_at timestamptz not null default now();
create index if not exists contactos_usuario_id_created_at_idx on public.contactos (usuario_id, created_at desc);

-- 2. Cada alta en auth.users crea su perfil con rol User.
-- SECURITY DEFINER permite que el trigger inserte incluso cuando RLS está habilitado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, colegio, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'colegio', ''),
    'User'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Crea perfiles para cuentas que se registraron antes de instalar el trigger.
insert into public.perfiles (id, nombre, colegio, rol)
select
  usuario.id,
  coalesce(usuario.raw_user_meta_data ->> 'nombre', usuario.raw_user_meta_data ->> 'full_name', split_part(usuario.email, '@', 1)),
  nullif(usuario.raw_user_meta_data ->> 'colegio', ''),
  'User'
from auth.users as usuario
on conflict (id) do nothing;

-- Sincroniza la marca de actualización sin requerir que el navegador pueda editarla.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists perfiles_set_updated_at on public.perfiles;
create trigger perfiles_set_updated_at
  before update on public.perfiles
  for each row execute procedure public.set_updated_at();

-- 3. Función que las políticas RLS usan para conocer el rol almacenado en la base de datos.
-- No se toman roles desde user_metadata porque el usuario puede modificar esos metadatos.
create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfiles
    where id = (select auth.uid())
      and rol = 'Admin'
  );
$$;

revoke all on function public.es_administrador() from public;
grant execute on function public.es_administrador() to authenticated;

-- 4. RLS y privilegios mínimos para perfiles.
-- Reemplaza solo las políticas previas de estas dos tablas para que una política
-- antigua y permisiva no deje una ruta de acceso abierta.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('perfiles', 'contactos', 'reportes')
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end;
$$;

alter table public.perfiles enable row level security;
revoke all on table public.perfiles from anon, authenticated;
grant select on table public.perfiles to authenticated;
grant update (nombre, colegio) on table public.perfiles to authenticated;

drop policy if exists perfiles_select_propios_o_admin on public.perfiles;
create policy perfiles_select_propios_o_admin
  on public.perfiles for select to authenticated
  using ((select auth.uid()) = id or (select public.es_administrador()));

-- Los clientes autenticados solo actualizan su propio perfil. El privilegio de columnas
-- anterior impide que puedan modificar la columna rol desde el navegador.
drop policy if exists perfiles_update_propios on public.perfiles;
create policy perfiles_update_propios
  on public.perfiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 5. RLS para contactos: el estudiante escribe/lee los propios; Admin puede leer todos.
alter table public.contactos enable row level security;
revoke all on table public.contactos from anon, authenticated;
grant select, insert on table public.contactos to authenticated;

-- Mantiene funcional el id autogenerado cuando contactos usa una secuencia serial.
do $$
declare
  sequence_name text;
begin
  select pg_get_serial_sequence('public.contactos', 'id') into sequence_name;
  if sequence_name is not null then
    execute format('grant usage, select on sequence %s to authenticated', sequence_name);
  end if;
end;
$$;

drop policy if exists contactos_insert_propios on public.contactos;
create policy contactos_insert_propios
  on public.contactos for insert to authenticated
  with check ((select auth.uid()) = usuario_id);

drop policy if exists contactos_select_propios_o_admin on public.contactos;
create policy contactos_select_propios_o_admin
  on public.contactos for select to authenticated
  using ((select auth.uid()) = usuario_id or (select public.es_administrador()));

-- No se crean políticas UPDATE ni DELETE para contactos: ni estudiante ni administrador
-- pueden cambiar o borrar los mensajes desde la aplicación web.

-- 6. Campos de clasificación y seguimiento para reportes.
create table if not exists public.reportes (
  id bigint generated by default as identity primary key,
  ticket text not null,
  ruta text not null default 'anonymous',
  categoria text not null default 'otro',
  descripcion text not null,
  ubicacion text,
  fecha_suceso date,
  riesgo text not null default 'Medio',
  estado text not null default 'pendiente',
  evidencia_url text,
  usuario_id uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now()
);

alter table public.reportes add column if not exists categoria text;
alter table public.reportes add column if not exists estado text;
alter table public.reportes add column if not exists creado_en timestamptz not null default now();
alter table public.reportes alter column categoria set default 'otro';
alter table public.reportes alter column estado set default 'pendiente';
update public.reportes set categoria = 'otro' where categoria is null or trim(categoria) = '';
update public.reportes
set estado = case lower(trim(replace(estado, '_', ' ')))
  when 'pendiente' then 'pendiente'
  when 'en proceso' then 'en_proceso'
  when 'resuelto' then 'resuelto'
  when 'posible denuncia falsa' then 'posible_denuncia_falsa'
  else 'pendiente'
end
where estado is null or lower(trim(replace(estado, '_', ' '))) not in ('pendiente', 'en proceso', 'resuelto', 'posible denuncia falsa');
alter table public.reportes alter column categoria set not null;
alter table public.reportes alter column estado set not null;
alter table public.reportes drop constraint if exists reportes_estado_check;
alter table public.reportes add constraint reportes_estado_check check (estado in ('pendiente', 'en_proceso', 'resuelto', 'posible_denuncia_falsa'));
create index if not exists reportes_usuario_id_creado_en_idx on public.reportes (usuario_id, creado_en desc);

-- Datos que ahora recopila el asistente conversacional. Se añaden sin borrar
-- columnas anteriores para mantener compatibles los reportes ya existentes.
alter table public.reportes add column if not exists involucrados text;
alter table public.reportes add column if not exists momento_suceso text;
alter table public.reportes add column if not exists conversacion jsonb not null default '[]'::jsonb;

alter table public.reportes enable row level security;
revoke all on table public.reportes from anon, authenticated;
grant select, insert on table public.reportes to authenticated;
grant update (estado) on table public.reportes to authenticated;

do $$
declare
  sequence_name text;
begin
  select pg_get_serial_sequence('public.reportes', 'id') into sequence_name;
  if sequence_name is not null then
    execute format('grant usage, select on sequence %s to authenticated', sequence_name);
  end if;
end;
$$;

drop policy if exists reportes_select_propios_o_admin on public.reportes;
create policy reportes_select_propios_o_admin
  on public.reportes for select to authenticated
  using ((select auth.uid()) = usuario_id or (select public.es_administrador()));

drop policy if exists reportes_insert_propios on public.reportes;
create policy reportes_insert_propios
  on public.reportes for insert to authenticated
  with check ((select auth.uid()) = usuario_id);

-- El administrador solo puede cambiar el estado, nunca la evidencia o el contenido.
drop policy if exists reportes_update_admin_estado on public.reportes;
create policy reportes_update_admin_estado
  on public.reportes for update to authenticated
  using ((select public.es_administrador()))
  with check ((select public.es_administrador()));

-- No se crean políticas DELETE: los reportes quedan protegidos contra borrado web.

-- 7. Evidencias múltiples y privadas del asistente conversacional.
create table if not exists public.reporte_evidencias (
  id bigint generated by default as identity primary key,
  reporte_id bigint not null references public.reportes(id) on delete restrict,
  usuario_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  nombre_original text not null,
  tipo_mime text not null default 'application/octet-stream',
  tamano_bytes bigint not null check (tamano_bytes > 0 and tamano_bytes <= 20971520),
  creado_en timestamptz not null default now()
);

create index if not exists reporte_evidencias_reporte_id_idx on public.reporte_evidencias (reporte_id);
alter table public.reporte_evidencias enable row level security;
revoke all on table public.reporte_evidencias from anon, authenticated;
grant select, insert on table public.reporte_evidencias to authenticated;

do $$
declare
  sequence_name text;
begin
  select pg_get_serial_sequence('public.reporte_evidencias', 'id') into sequence_name;
  if sequence_name is not null then
    execute format('grant usage, select on sequence %s to authenticated', sequence_name);
  end if;
end;
$$;

drop policy if exists reporte_evidencias_select_propias_o_admin on public.reporte_evidencias;
create policy reporte_evidencias_select_propias_o_admin
  on public.reporte_evidencias for select to authenticated
  using ((select auth.uid()) = usuario_id or (select public.es_administrador()));

drop policy if exists reporte_evidencias_insert_propias on public.reporte_evidencias;
create policy reporte_evidencias_insert_propias
  on public.reporte_evidencias for insert to authenticated
  with check ((select auth.uid()) = usuario_id);

-- Bucket privado: los archivos se consultan con URL firmada de corta duración.
insert into storage.buckets (id, name, public, file_size_limit)
values ('reportes-evidencias', 'reportes-evidencias', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists evidencias_storage_insert_propias on storage.objects;
create policy evidencias_storage_insert_propias
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reportes-evidencias' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists evidencias_storage_select_propias_o_admin on storage.objects;
create policy evidencias_storage_select_propias_o_admin
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reportes-evidencias'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_administrador()))
  );

drop policy if exists evidencias_storage_delete_propias on storage.objects;
create policy evidencias_storage_delete_propias
  on storage.objects for delete to authenticated
  using (bucket_id = 'reportes-evidencias' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Inserta reporte y metadatos de todas sus evidencias en una sola transacción.
create or replace function public.registrar_reporte_con_evidencias(
  p_ticket text,
  p_categoria text,
  p_descripcion text,
  p_ubicacion text,
  p_fecha_suceso text,
  p_involucrados text,
  p_riesgo text,
  p_conversacion jsonb,
  p_evidencias jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  nuevo_reporte_id bigint;
  evidencia jsonb;
begin
  if auth.uid() is null then raise exception 'Se requiere una sesión autenticada'; end if;
  if length(trim(coalesce(p_descripcion, ''))) < 10 then raise exception 'La descripción es demasiado corta'; end if;
  if trim(coalesce(p_involucrados, '')) = '' then raise exception 'Falta indicar las personas involucradas'; end if;
  if jsonb_array_length(coalesce(p_evidencias, '[]'::jsonb)) > 5 then raise exception 'Máximo 5 evidencias'; end if;

  insert into public.reportes (
    ticket, ruta, categoria, descripcion, ubicacion, fecha_suceso, momento_suceso,
    involucrados, riesgo, estado, usuario_id, conversacion, creado_en
  ) values (
    left(trim(p_ticket), 40), 'assistant', coalesce(nullif(trim(p_categoria), ''), 'otro'),
    trim(p_descripcion), nullif(trim(coalesce(p_ubicacion, '')), ''),
    case when trim(coalesce(p_fecha_suceso, '')) ~ '^\d{4}-\d{2}-\d{2}$' then p_fecha_suceso::date else null end,
    nullif(trim(coalesce(p_fecha_suceso, '')), ''),
    trim(p_involucrados), case when p_riesgo in ('Medio','Alto','Crítico') then p_riesgo else 'Medio' end,
    'pendiente', auth.uid(), coalesce(p_conversacion, '[]'::jsonb), now()
  ) returning id into nuevo_reporte_id;

  for evidencia in select value from jsonb_array_elements(coalesce(p_evidencias, '[]'::jsonb)) loop
    if evidencia ->> 'storage_path' not like auth.uid()::text || '/%' then
      raise exception 'Ruta de evidencia no autorizada';
    end if;
    insert into public.reporte_evidencias (reporte_id, usuario_id, storage_path, nombre_original, tipo_mime, tamano_bytes)
    values (
      nuevo_reporte_id, auth.uid(), left(evidencia ->> 'storage_path', 500),
      left(evidencia ->> 'nombre_original', 255), left(coalesce(evidencia ->> 'tipo_mime','application/octet-stream'), 120),
      (evidencia ->> 'tamano_bytes')::bigint
    );
  end loop;

  return jsonb_build_object('id', nuevo_reporte_id, 'ticket', p_ticket);
end;
$$;

revoke all on function public.registrar_reporte_con_evidencias(text,text,text,text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.registrar_reporte_con_evidencias(text,text,text,text,text,text,text,jsonb,jsonb) to authenticated;

-- 8. Asignación manual del primer administrador.
-- Ejecuta esta sentencia una vez, después de que el correo ya se haya registrado.
update public.perfiles as perfil
set rol = 'Admin'
from auth.users as usuario
where perfil.id = usuario.id
  and lower(usuario.email) = 'eligetuvidareportes@gmail.com';

-- Verificación opcional: debe mostrar el usuario con rol Admin.
select perfil.id, perfil.nombre, usuario.email, perfil.rol
from public.perfiles as perfil
join auth.users as usuario on usuario.id = perfil.id
where lower(usuario.email) = 'eligetuvidareportes@gmail.com';
