// Planos e valores: ficam só no painel e vão apenas na mensagem de WhatsApp (nunca no site).
export const PLANOS_PADRAO = [
  { nome: "Essencial", preco: 497, parcelas: "ou 3x de R$ 175", prazo: "5 dias úteis", destaque: false,
    itens: ["Site de uma página com a cara do seu negócio", "Suas fotos, serviços e preços", "Botão direto para o WhatsApp", "Mapa e endereço", "Funciona bem no celular", "Publicação incluída"] },
  { nome: "Profissional", preco: 897, parcelas: "ou 3x de R$ 315", prazo: "7 dias úteis", destaque: true,
    itens: ["Tudo do Essencial", "Domínio próprio .com.br por 1 ano", "Galeria de fotos e cardápio/tabela completa", "Ajuste do seu perfil no Google", "2 rodadas de ajustes"] },
  { nome: "Manutenção mensal", preco: 59, parcelas: "por mês (opcional)", prazo: "", destaque: false,
    itens: ["Site sempre no ar", "Troca de textos, preços e fotos", "Suporte pelo WhatsApp"] },
];

export const reais = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
