import vibeFit from "@/assets/locais/novembro-2026/vibe-fit.jpg.asset.json";
import nutrifit from "@/assets/locais/novembro-2026/nutrifit-lounge.jpg.asset.json";
import fazendinhaPocao from "@/assets/locais/novembro-2026/fazendinha-pocao.jpg.asset.json";
import fazendinhaCentro from "@/assets/locais/novembro-2026/fazendinha-centro.jpg.asset.json";
import restauranteJr from "@/assets/locais/novembro-2026/restaurante-lanchonete-jr.jpg.asset.json";
import vidaPilates from "@/assets/locais/novembro-2026/vida-pilates.jpg.asset.json";
import evandro from "@/assets/locais/novembro-2026/evandro-barbearia.jpg.asset.json";
import studioJundiai from "@/assets/locais/novembro-2026/studio-sa-jundiai.jpg.asset.json";
import studioCampoLimpo from "@/assets/locais/novembro-2026/studio-sa-campo-limpo.jpg.asset.json";

export const evandroPhoto = {
  img: evandro.url,
  alt: "Tela TelaHUB na Evandro Barbearia, Campo Limpo Paulista",
};

export const studioCampoLimpoPhoto = {
  img: studioCampoLimpo.url,
  alt: "Tela TelaHUB no Studio S&A, Campo Limpo Paulista",
};

export const places = [
  { img: vibeFit.url, alt: "Tela TelaHUB na Vibe Fit, Campo Limpo Paulista" },
  { img: nutrifit.url, alt: "Tela TelaHUB no Nutrifit Lounge, Jundiaí" },
  { img: fazendinhaPocao.url, alt: "Tela TelaHUB na Fazendinha Poção, Campo Limpo Paulista" },
  { img: fazendinhaCentro.url, alt: "Tela TelaHUB na Fazendinha do Lô — Centro, Campo Limpo Paulista" },
  { img: restauranteJr.url, alt: "Tela TelaHUB no Restaurante e Lanchonete JR, Campo Limpo Paulista" },
  { img: vidaPilates.url, alt: "Tela TelaHUB na Vida Pilates, Jundiaí" },
  evandroPhoto,
  { img: studioJundiai.url, alt: "Tela TelaHUB no Studio S&A, unidade Jundiaí" },
  studioCampoLimpoPhoto,
];