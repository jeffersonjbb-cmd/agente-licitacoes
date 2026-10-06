import { NextRequest, NextResponse } from 'next/server';

const LICITACOES_MOCK = [
  {
    id: "1001",
    numero: "2026/0001",
    orgao: "SEBRAE/RR",
    objeto: "Desenvolvimento de sistema de gestão de projetos",
    valor: 185000,
    uf: "RR",
    cidade: "Boa Vista",
    dataEncerramento: "2026-09-30"
  },
  {
    id: "1004",
    numero: "2026/0004",
    orgao: "Câmara Municipal de Boa Vista",
    objeto: "Migração de data center para cloud services",
    valor: 350000,
    uf: "RR",
    cidade: "Boa Vista",
    dataEncerramento: "2026-10-01"
  },
  {
    id: "1005",
    numero: "2026/0005",
    orgao: "IFAM Campus Manaus",
    objeto: "Aquisição de computadores para laboratório de programação",
    valor: 250000,
    uf: "AM",
    cidade: "Manaus",
    dataEncerramento: "2026-09-25"
  },
  {
    id: "1007",
    numero: "2026/0007",
    orgao: "Polícia Civil/RR",
    objeto: "Desenvolvimento de app mobile para denúncias anônimas",
    valor: 145000,
    uf: "RR",
    cidade: "Boa Vista",
    dataEncerramento: "2026-09-24"
  },
  {
    id: "1009",
    numero: "2026/0009",
    orgao: "Universidade Federal do Amazonas",
    objeto: "Plataforma de educação a distância com inteligência artificial",
    valor: 420000,
    uf: "AM",
    cidade: "Manaus",
    dataEncerramento: "2026-10-02"
  }
];

export async function POST(request: NextRequest) {
  try {
    const { segmento, budgetMin, budgetMax, estado } = await request.json();

    // Filtrar por estado e segmento (buscar no objeto)
    const filtradas = LICITACOES_MOCK.filter(lic => 
      lic.uf === estado &&
      lic.objeto.toLowerCase().includes(segmento.toLowerCase()) &&
      lic.valor >= budgetMin &&
      lic.valor <= budgetMax
    );

    // Se nada filtrar, retorna tudo do estado
    const resultado = filtradas.length > 0 ? filtradas : 
      LICITACOES_MOCK.filter(lic => lic.uf === estado).slice(0, 5);

    // Gerar análise padrão
    const analise = gerarAnalise(resultado, segmento, budgetMax);

    return NextResponse.json({
      licitacoes: resultado,
      analise,
      total: resultado.length,
      sucesso: true
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({
      licitacoes: [],
      analise: 'Erro ao buscar licitações',
      total: 0,
      sucesso: false
    }, { status: 500 });
  }
}

function gerarAnalise(licitacoes: any[], segmento: string, budget: number) {
  if (!licitacoes || licitacoes.length === 0) {
    return 'Nenhuma licitação encontrada para os critérios informados.';
  }

  const top1 = licitacoes[0];
  const top2 = licitacoes[1];
  const top3 = licitacoes[2];

  return `🏆 TOP OPORTUNIDADES PARA MEI DE ${segmento.toUpperCase()}

### 1. TOP 1: ${top1?.orgao}
- Valor: R$ ${top1?.valor?.toLocaleString('pt-BR')}
- Objeto: ${top1?.objeto}
- Deadline: ${top1?.dataEncerramento}
- Ação: Baixar edital e verificar pré-requisitos

${top2 ? `
### 2. TOP 2: ${top2?.orgao}
- Valor: R$ ${top2?.valor?.toLocaleString('pt-BR')}
- Objeto: ${top2?.objeto}
` : ''}

${top3 ? `
### 3. TOP 3: ${top3?.orgao}
- Valor: R$ ${top3?.valor?.toLocaleString('pt-BR')}
- Objeto: ${top3?.objeto}
` : ''}

⚠️ AVISO CRÍTICO:
Limite MEI = R$ 81k/ano. Qualquer contrato acima pode exigir migração para ME.
Consulte seu contador ANTES de participar.`;
}