import { NextRequest, NextResponse } from "next/server";

// Vercel: tempo máximo da função (plano Hobby aceita até 60s; ajuste se necessário)
export const maxDuration = 30;

// ==========================================
// CONFIGURAÇÃO
// ==========================================

// Endpoint confirmado na especificação OpenAPI do PNCP (API PNCP Consulta)
const PNCP_PROPOSTA_URL = "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta";
const UF = "RR";
const TAMANHO_PAGINA = 50; // máximo permitido pela API
const MAX_PAGINAS = 6; // limita a 300 contratações por busca
const INTERVALO_MS = 1500; // pausa entre páginas (limite citado por terceiros, não oficial)
const JANELA_DIAS = 120; // propostas com encerramento nos próximos 120 dias
const LIMITE_MEI_ANUAL = 81000; // faturamento bruto anual do MEI (não é valor por contrato)

// Palavras-chave definidas pelo usuário, aplicadas sobre objetoCompra
const PALAVRAS_CHAVE: RegExp[] = [
  /\binform[aá]tica\b/i,
  /\bsistemas?\b/i,
  /\baplicativos?\b/i,
  /\bTI\b/, // case-sensitive para não casar "ti" dentro de outras palavras
  /\bsoftware\b/i,
];

// ==========================================
// TIPOS (campos conforme RecuperarCompraPublicacaoDTO da API PNCP)
// ==========================================

type ItemPNCP = {
  numeroControlePNCP: string;
  objetoCompra: string | null;
  valorTotalEstimado: number | null;
  dataEncerramentoProposta: string | null;
  orgaoEntidade?: { razaoSocial?: string };
  unidadeOrgao?: { ufSigla?: string; municipioNome?: string };
  linkSistemaOrigem?: string | null;
  linkProcessoEletronico?: string | null;
};

type RespostaPNCP = {
  data: ItemPNCP[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
  empty: boolean;
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

const pausa = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Formato exigido pela API: yyyyMMdd
function formatarDataPNCP(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}${mes}${dia}`;
}

// Converte "2026-08-13T08:30:01" para "13/08/2026"
function formatarDataBR(iso: string | null): string {
  if (!iso) return "N/A";
  const [data] = iso.split("T");
  const [ano, mes, dia] = data.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "N/A";
}

function corresponde(objeto: string): boolean {
  return PALAVRAS_CHAVE.some((regex) => regex.test(objeto));
}

// ==========================================
// PASSO 1: BUSCAR PROPOSTAS ABERTAS NO PNCP
// ==========================================

async function buscarPropostasAbertas(): Promise<ItemPNCP[]> {
  const dataFinal = formatarDataPNCP(new Date(Date.now() + JANELA_DIAS * 24 * 60 * 60 * 1000));
  const todos: ItemPNCP[] = [];

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const params = new URLSearchParams({
      dataFinal,
      uf: UF,
      pagina: String(pagina),
      tamanhoPagina: String(TAMANHO_PAGINA),
    });

    const res = await fetch(`${PNCP_PROPOSTA_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`PNCP respondeu HTTP ${res.status} na página ${pagina}`);
    }

    const json = (await res.json()) as RespostaPNCP;
    todos.push(...(json.data ?? []));

    if (json.empty || json.paginasRestantes <= 0) break;
    await pausa(INTERVALO_MS);
  }

  return todos;
}

// ==========================================
// PASSO 2: MAPEAR CAMPOS E APLICAR FILTRO
// ==========================================

function mapearLicitacao(item: ItemPNCP) {
  const valor =
    item.valorTotalEstimado && item.valorTotalEstimado > 0 ? item.valorTotalEstimado : null;

  return {
    id: item.numeroControlePNCP,
    orgao: item.orgaoEntidade?.razaoSocial ?? "N/A",
    objeto: item.objetoCompra ?? "",
    valor, // null quando zerado ou não informado
    valorTexto:
      valor === null
        ? "valor não informado"
        : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    uf: item.unidadeOrgao?.ufSigla ?? UF,
    cidade: item.unidadeOrgao?.municipioNome ?? "N/A",
    dataEncerramento: item.dataEncerramentoProposta,
    dataEncerramentoBR: formatarDataBR(item.dataEncerramentoProposta),
    link: item.linkSistemaOrigem || item.linkProcessoEletronico || null,
  };
}

// ==========================================
// PASSO 3: ANÁLISE (texto fixo, sem IA)
// ==========================================

function gerarAnalise(licitacoes: ReturnType<typeof mapearLicitacao>[]): string {
  if (licitacoes.length === 0) {
    return "Nenhuma proposta aberta em Roraima com as palavras-chave: Informática, sistema, aplicativos, TI, software.";
  }

  const proximas = licitacoes
    .slice(0, 3)
    .map((l, i) => `${i + 1}. ${l.orgao} | ${l.valorTexto} | encerra em ${l.dataEncerramentoBR}\n   Objeto: ${l.objeto}`)
    .join("\n\n");

  return (
    `Propostas abertas encontradas: ${licitacoes.length}. Próximas a encerrar:\n\n${proximas}\n\n` +
    `AVISO: o limite de faturamento do MEI é de R$ ${LIMITE_MEI_ANUAL.toLocaleString("pt-BR")},00 por ano ` +
    `(não por contrato). Contratos acima desse valor podem exigir migração para ME. ` +
    `Consulte seu contador antes de participar.`
  );
}

// ==========================================
// PASSO 4: NOTIFICAÇÃO SLACK (opcional)
// ==========================================

async function notificarSlack(texto: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: texto }),
    });
  } catch (error) {
    console.error("Erro ao enviar para o Slack:", error);
  }
}

// ==========================================
// HANDLER
// ==========================================

export async function POST(request: NextRequest) {
  try {
    // Parâmetros recebidos do front não alteram o escopo: UF fixa RR e palavras-chave fixas.
    await request.json().catch(() => ({}));

    const itens = await buscarPropostasAbertas();

    const licitacoes = itens
      .filter((item) => corresponde(item.objetoCompra ?? ""))
      .map(mapearLicitacao)
      .sort((a, b) => (a.dataEncerramento ?? "").localeCompare(b.dataEncerramento ?? ""));

    const analise = gerarAnalise(licitacoes);

    if (licitacoes.length > 0) {
      await notificarSlack(
        `🎯 BUSCA PNCP - Roraima\n📊 Encontradas: ${licitacoes.length} propostas abertas\n\n${analise}`
      );
    }

    return NextResponse.json({
      licitacoes,
      analise,
      total: licitacoes.length,
      totalConsultadas: itens.length,
      sucesso: true,
    });
  } catch (error) {
    console.error("Erro ao buscar PNCP:", error);
    return NextResponse.json(
      {
        licitacoes: [],
        analise: "Não foi possível consultar o PNCP no momento.",
        total: 0,
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 502 }
    );
  }
}