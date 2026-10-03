-- Capa dos vídeos de exercício: um JPEG ao lado do vídeo (mesmo nome, .jpg), mostrado enquanto o vídeo carrega.
-- O app reduz o vídeo no celular antes de enviar; o limite de 50 MB fica só para quando não dá para reduzir.
update storage.buckets
   set allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'image/jpeg']
 where id = 'videos';
