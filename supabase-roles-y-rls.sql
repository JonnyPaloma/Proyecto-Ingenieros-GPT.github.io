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
      and tablename in ('perfiles', 'contactos')
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

-- 6. Asignación manual del primer administrador.
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
