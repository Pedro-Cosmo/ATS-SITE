create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  descricao text not null check (length(btrim(descricao)) > 0),
  imagem_path text not null,
  created_at timestamptz not null default now()
);

alter table public.colaboradores enable row level security;

create policy "Publico pode consultar colaboradores"
  on public.colaboradores
  for select
  to anon, authenticated
  using (true);

create policy "Administradores podem gerenciar colaboradores"
  on public.colaboradores
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Administradores podem enviar fotos de colaboradores"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-images'
    and (storage.foldername(name))[1] = 'colaboradores'
    and public.is_admin()
  );
