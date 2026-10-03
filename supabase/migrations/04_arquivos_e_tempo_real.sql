-- Arquivos (vídeos dos exercícios, fotos de evolução, fotos e áudios da conversa) e tempo real do chat.
-- Tudo privado: o app mostra os arquivos por links temporários assinados.
--
-- Caminhos:
--   videos/{personal_id}/{arquivo}            personal grava; os alunos dele assistem
--   fotos/{personal_id}/{aluno_id}/{arquivo}  personal e o próprio aluno
--   conversas/{personal_id}/{aluno_id}/{arquivo}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('videos', 'videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']),
  ('fotos', 'fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('conversas', 'conversas', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/x-m4a'])
on conflict (id) do nothing;

create policy videos_ler on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (storage.foldername(name))[1] = (select public.personal_do_aluno())::text));
create policy videos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy videos_trocar on storage.objects for update to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy videos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy aluno_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id in ('fotos', 'conversas') and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] = (select public.personal_do_aluno())::text
        and (storage.foldername(name))[2] = (select public.meu_aluno_id())::text)));
create policy aluno_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos', 'conversas') and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] = (select public.personal_do_aluno())::text
        and (storage.foldername(name))[2] = (select public.meu_aluno_id())::text)));
create policy aluno_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos', 'conversas') and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] = (select public.personal_do_aluno())::text
        and (storage.foldername(name))[2] = (select public.meu_aluno_id())::text)));

alter publication supabase_realtime add table public.mensagens, public.checkins;
