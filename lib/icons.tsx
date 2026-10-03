import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
});
const mk = (paths: ReactNode) =>
  function Icone({ size, ...rest }: P) {
    return <svg {...base(size)} {...rest}>{paths}</svg>;
  };

export const IconInicio = mk(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></>);
export const IconIndicadores = mk(<><path d="M4 20h16" /><path d="M7 16v-4M12 16V7M17 16v-6" /></>);
export const IconAlvo = mk(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12h.01" /></>);
export const IconPagar = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5" /></>);
export const IconReceber = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8.5 12.5 12 16l3.5-3.5" /></>);
export const IconFixas = mk(<><path d="M17 3l3 3-3 3" /><path d="M20 6H9a5 5 0 0 0-5 5v1" /><path d="M7 21l-3-3 3-3" /><path d="M4 18h11a5 5 0 0 0 5-5v-1" /></>);
export const IconAgenda = mk(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>);
export const IconClientes = mk(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3" /></>);
export const IconCopiloto = mk(<><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><circle cx="18.5" cy="17.5" r="1.5" /></>);
export const IconIntegracoes = mk(<><path d="M9 3v4M15 3v4" /><path d="M6.5 7h11v3.5a5.5 5.5 0 0 1-11 0z" /><path d="M12 16v5" /></>);
export const IconAjustes = mk(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IconMais = mk(<><path d="M12 5v14M5 12h14" /></>);
export const IconFechar = mk(<><path d="M6 6l12 12M18 6 6 18" /></>);
export const IconEsq = mk(<><path d="m15 6-6 6 6 6" /></>);
export const IconDir = mk(<><path d="m9 6 6 6-6 6" /></>);
export const IconCheck = mk(<><path d="M5 12.5l4.5 4.5L19 7.5" /></>);
export const IconLixo = mk(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>);
export const IconLapis = mk(<><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>);
export const IconSair = mk(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>);
export const IconMenu = mk(<><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>);
export const IconCopiar = mk(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>);
export const IconTendencia = mk(<><path d="M3 7l6 6 4-4 8 8" /><path d="M21 11v6h-6" /></>);
export const IconInfo = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></>);
export const IconEnviar = mk(<><path d="M4 12l16-8-6 16-2.5-6.5z" /></>);
export const IconConversa = mk(<><path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8.5z" /><path d="M9 9h6M9 12h4" /></>);
export const IconCheckin = mk(<><rect x="4.5" y="4" width="15" height="17" rx="2" /><path d="M9 3v2.5h6V3" /><path d="M8.5 13l2.3 2.3 4.7-4.6" /></>);
export const IconHalter = mk(<><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></>);
export const IconVideo = mk(<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3" /></>);
export const IconDinheiro = mk(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" /></>);
export const IconEvolucao = mk(<><path d="M4 19h16" /><path d="M5 15l4.5-4.5 3.5 3L19 7" /><path d="M14.5 7H19v4.5" /></>);
export const IconCamera = mk(<><path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.6" /></>);
export const IconMic = mk(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>);
export const IconPlay = mk(<><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" /></>);
export const IconPause = mk(<><rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" /></>);
export const IconFoto = mk(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.6" /><path d="M20.5 15.5l-5-5-9 9" /></>);
export const IconWhats = mk(<><path d="M4 20l1.2-3.6A8 8 0 1 1 8 19z" /><path d="M9.2 8.6c.2 2.9 2.4 5.3 5.4 5.9l1-1.3-1.8-1-.8.8c-.9-.4-1.6-1.1-2-2l.8-.8-1-1.8z" /></>);
export const IconCadeado = mk(<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>);
export const IconBusca = mk(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></>);
export const IconClip = mk(<><path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></>);
export const IconLink = mk(<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>);
export const IconSubir = mk(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>);
export const IconOlho = mk(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IconBaixo = mk(<><path d="m6 9 6 6 6-6" /></>);
export const IconCima = mk(<><path d="m6 15 6-6 6 6" /></>);
export const IconCelular = mk(<><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></>);
