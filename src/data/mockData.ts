export type UserRole = 'gestor' | 'funcionario' | 'cliente';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  obraIds: string[];
}

export interface Obra {
  id: string;
  nome: string;
  codigo: string;
  cliente: string;
  endereco: string;
  status: 'planejamento' | 'em_andamento' | 'pausada' | 'concluida';
  dataInicio: string;
  dataPrevisaoTermino: string;
  responsavel: string;
  percentualAndamento: number;
  descricao: string;
}

export interface OrcamentoItem {
  id: string;
  obraId: string;
  categoria: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  custoUnitarioPrevisto: number;
  custoTotalPrevisto: number;
  custoRealizado: number;
  observacoes: string;
  status: 'pendente' | 'em_execucao' | 'concluido';
}

export interface CronogramaEtapa {
  id: string;
  obraId: string;
  nome: string;
  dataInicioPrevista: string;
  dataFimPrevista: string;
  dataInicioReal: string | null;
  dataFimReal: string | null;
  status: 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada';
  percentual: number;
  responsavel: string;
  observacoes: string;
}

export interface DiarioServico {
  id: string;
  descricao: string;
  categoriaId?: string; // linked to OrcamentoCategoria
  composicaoId?: string; // linked to OrcamentoComposicao
  percentualAdicionado?: number; // % added to that etapa
}

export interface DiarioMaterialUsado {
  id: string;
  materialId: string;
  materialNome: string;
  unidade: string;
  quantidade: number;
}

export interface DiarioRegistro {
  id: string;
  obraId: string;
  data: string;
  usuario: string;
  usuarioId: string;
  clima: 'sol' | 'nublado' | 'chuva' | 'chuvoso_forte';
  trabalhadores: number;
  servicosExecutados: string;
  servicos: DiarioServico[];
  materiaisUtilizados: DiarioMaterialUsado[];
  observacoes: string;
  problemas: string;
  fotos: string[];
  status: 'pendente' | 'aprovado' | 'rejeitado';
}

export interface Material {
  id: string;
  obraId: string;
  nome: string;
  categoria: string;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  localizacao: string;
  observacoes: string;
}

export interface MovimentacaoEstoque {
  id: string;
  obraId: string;
  materialId: string;
  materialNome: string;
  tipo: 'entrada' | 'saida';
  data: string;
  quantidade: number;
  origemDestino: string;
  responsavel: string;
  observacoes: string;
}

// ── Mock Users ──
export const mockUsers: User[] = [
  { id: 'u1', name: 'Carlos Mendes', email: 'gestor@teste.com', role: 'gestor', obraIds: ['ob1', 'ob2', 'ob3'] },
  { id: 'u2', name: 'José Silva', email: 'funcionario@teste.com', role: 'funcionario', obraIds: ['ob1', 'ob3'] },
  { id: 'u3', name: 'Maria Oliveira', email: 'cliente@teste.com', role: 'cliente', obraIds: ['ob1'] },
];

// ── Mock Obras (3 situações distintas) ──
export const mockObras: Obra[] = [
  // Obra 1 – Em andamento, ~45% concluída
  {
    id: 'ob1',
    nome: 'Residencial Vila Nova',
    codigo: 'OBR-2025-001',
    cliente: 'Maria Oliveira',
    endereco: 'Rua das Palmeiras, 450 - Vila Nova, São Paulo/SP',
    status: 'em_andamento',
    dataInicio: '2025-06-02',
    dataPrevisaoTermino: '2026-09-30',
    responsavel: 'Carlos Mendes',
    percentualAndamento: 45,
    descricao: 'Construção de residência unifamiliar com 3 pavimentos, área total de 280m². Projeto inclui piscina e área gourmet.',
  },
  // Obra 2 – Planejamento, 0%
  {
    id: 'ob2',
    nome: 'Edifício Comercial Centro',
    codigo: 'OBR-2026-002',
    cliente: 'Pedro Santos',
    endereco: 'Av. Paulista, 1200 - Bela Vista, São Paulo/SP',
    status: 'planejamento',
    dataInicio: '2026-06-01',
    dataPrevisaoTermino: '2027-12-31',
    responsavel: 'Carlos Mendes',
    percentualAndamento: 0,
    descricao: 'Construção de edifício comercial de 6 pavimentos com 24 salas, 2 subsolos de garagem e área comum com auditório. Área total de 3.200m².',
  },
  // Obra 3 – Concluída, 100%
  {
    id: 'ob3',
    nome: 'Reforma Clínica Saúde Total',
    codigo: 'OBR-2025-003',
    cliente: 'Dr. André Martins',
    endereco: 'Rua Augusta, 890 - Consolação, São Paulo/SP',
    status: 'concluida',
    dataInicio: '2025-01-06',
    dataPrevisaoTermino: '2025-07-31',
    responsavel: 'Ricardo Ferreira',
    percentualAndamento: 100,
    descricao: 'Reforma completa de clínica médica com 8 consultórios, recepção, sala de espera e área administrativa. Área de 420m².',
  },
];

// ── Mock Orcamento Items (legacy, usado pelo seed) ──
export const mockOrcamentoItens: OrcamentoItem[] = [];

// ── Mock Cronograma (legacy) ──
export const mockCronograma: CronogramaEtapa[] = [];

// ── Mock Diário de Obra ──
export const mockDiario: DiarioRegistro[] = [
  // Obra 1 – registros recentes (março/abril 2026)
  { id: 'd1', obraId: 'ob1', data: '2026-04-01', usuario: 'José Silva', usuarioId: 'u2', clima: 'sol', trabalhadores: 8, servicosExecutados: 'Chapisco interno nas paredes do 1º pavimento. Passagem de eletrodutos no 2º pavimento.', servicos: [{ id: 'ds1', descricao: 'Chapisco interno - paredes 1º pavimento', categoriaId: 'ob1-cat8', percentualAdicionado: 5 }, { id: 'ds2', descricao: 'Passagem de eletrodutos no 2º pavimento', categoriaId: 'ob1-cat6' }], materiaisUtilizados: [{ id: 'dmu1', materialId: 'm1', materialNome: 'Cimento CP-II 50kg', unidade: 'saco', quantidade: 12 }], observacoes: 'Revestimentos avançando conforme planejado.', problemas: '', fotos: [], status: 'aprovado' },
  { id: 'd2', obraId: 'ob1', data: '2026-03-31', usuario: 'José Silva', usuarioId: 'u2', clima: 'nublado', trabalhadores: 7, servicosExecutados: 'Instalação de tubulação de água fria nos banheiros do 2º pav. Alvenaria de arremate na cobertura.', servicos: [{ id: 'ds3', descricao: 'Tubulação de água fria - banheiros 2º pav', categoriaId: 'ob1-cat7', percentualAdicionado: 3 }, { id: 'ds4', descricao: 'Alvenaria de arremate na cobertura' }], materiaisUtilizados: [{ id: 'dmu3', materialId: 'm6', materialNome: 'Tubo PVC 100mm esgoto', unidade: 'barra', quantidade: 4 }], observacoes: 'Tempo nublado, sem interrupções.', problemas: '', fotos: [], status: 'aprovado' },
  { id: 'd3', obraId: 'ob1', data: '2026-03-28', usuario: 'José Silva', usuarioId: 'u2', clima: 'chuva', trabalhadores: 4, servicosExecutados: 'Serviços internos - passagem de fiação elétrica no térreo e 1º pavimento.', servicos: [{ id: 'ds5', descricao: 'Passagem de fiação elétrica - térreo e 1º pav', categoriaId: 'ob1-cat6', percentualAdicionado: 5 }], materiaisUtilizados: [{ id: 'dmu4', materialId: 'm8', materialNome: 'Fio 2,5mm² azul', unidade: 'rolo', quantidade: 2 }], observacoes: 'Chuva forte pela manhã impediu trabalho externo.', problemas: 'Chuva forte interrompeu serviços externos por 4 horas', fotos: [], status: 'pendente' },
  { id: 'd4', obraId: 'ob1', data: '2026-03-27', usuario: 'José Silva', usuarioId: 'u2', clima: 'sol', trabalhadores: 9, servicosExecutados: 'Conclusão da instalação de telhas. Início do chapisco externo.', servicos: [{ id: 'ds7', descricao: 'Finalização da instalação de telhas', categoriaId: 'ob1-cat5', composicaoId: 'ob1-c5-2', percentualAdicionado: 10 }, { id: 'ds8', descricao: 'Início do chapisco externo - fachada lateral', categoriaId: 'ob1-cat8', percentualAdicionado: 3 }], materiaisUtilizados: [], observacoes: 'Boa produtividade. Telhas finalizadas.', problemas: '', fotos: [], status: 'aprovado' },
  { id: 'd5', obraId: 'ob1', data: '2026-03-26', usuario: 'José Silva', usuarioId: 'u2', clima: 'sol', trabalhadores: 8, servicosExecutados: 'Instalação de calhas e rufos na cobertura. Emboço do hall de entrada.', servicos: [{ id: 'ds9', descricao: 'Instalação de calhas e rufos', categoriaId: 'ob1-cat5', composicaoId: 'ob1-c5-3', percentualAdicionado: 15 }, { id: 'ds10', descricao: 'Emboço do hall de entrada', categoriaId: 'ob1-cat8', percentualAdicionado: 2 }], materiaisUtilizados: [], observacoes: 'Calhas e rufos em 50%. Sem imprevistos.', problemas: '', fotos: [], status: 'aprovado' },

  // Obra 1 – registro rejeitado para mostrar todos os status
  { id: 'd8', obraId: 'ob1', data: '2026-03-20', usuario: 'José Silva', usuarioId: 'u2', clima: 'sol', trabalhadores: 6, servicosExecutados: 'Serviços diversos.', servicos: [{ id: 'ds16', descricao: 'Serviços gerais no canteiro' }], materiaisUtilizados: [], observacoes: 'Registro incompleto.', problemas: '', fotos: [], status: 'rejeitado' },

  // Obra 3 – registros finais da reforma concluída
  { id: 'd6', obraId: 'ob3', data: '2025-07-28', usuario: 'José Silva', usuarioId: 'u2', clima: 'sol', trabalhadores: 5, servicosExecutados: 'Limpeza final de toda a clínica. Instalação de placas de sinalização. Vistoria final.', servicos: [{ id: 'ds11', descricao: 'Limpeza final de toda a clínica' }, { id: 'ds12', descricao: 'Instalação de placas de sinalização' }, { id: 'ds13', descricao: 'Vistoria final' }], materiaisUtilizados: [], observacoes: 'Obra entregue ao cliente conforme projeto. Todas as pendências resolvidas.', problemas: '', fotos: [], status: 'aprovado' },
  { id: 'd7', obraId: 'ob3', data: '2025-07-25', usuario: 'José Silva', usuarioId: 'u2', clima: 'nublado', trabalhadores: 6, servicosExecutados: 'Pintura de retoques finais. Instalação de louças e metais dos banheiros restantes.', servicos: [{ id: 'ds14', descricao: 'Pintura de retoques finais' }, { id: 'ds15', descricao: 'Instalação de louças e metais dos banheiros' }], materiaisUtilizados: [{ id: 'dmu6', materialId: 'm9', materialNome: 'Tinta acrílica branca 18L', unidade: 'lata', quantidade: 2 }], observacoes: 'Últimos ajustes antes da entrega.', problemas: '', fotos: [], status: 'aprovado' },
];

// ── Mock Materiais ──
export const mockMateriais: Material[] = [
  // Obra 1
  { id: 'm1', obraId: 'ob1', nome: 'Cimento CP-II 50kg', categoria: 'Cimento', unidade: 'saco', estoqueAtual: 38, estoqueMinimo: 20, localizacao: 'Almoxarifado', observacoes: '' },
  { id: 'm2', obraId: 'ob1', nome: 'Areia média', categoria: 'Agregados', unidade: 'm³', estoqueAtual: 6, estoqueMinimo: 5, localizacao: 'Pátio', observacoes: '' },
  { id: 'm3', obraId: 'ob1', nome: 'Brita 1', categoria: 'Agregados', unidade: 'm³', estoqueAtual: 2, estoqueMinimo: 5, localizacao: 'Pátio', observacoes: 'Estoque baixo - solicitar reposição' },
  { id: 'm4', obraId: 'ob1', nome: 'Aço CA-50 10mm', categoria: 'Aço', unidade: 'barra', estoqueAtual: 25, estoqueMinimo: 30, localizacao: 'Almoxarifado', observacoes: 'Estoque baixo' },
  { id: 'm5', obraId: 'ob1', nome: 'Tijolo cerâmico 9x19x19', categoria: 'Alvenaria', unidade: 'un', estoqueAtual: 800, estoqueMinimo: 500, localizacao: 'Pátio', observacoes: '' },
  { id: 'm6', obraId: 'ob1', nome: 'Tubo PVC 100mm esgoto', categoria: 'Hidráulica', unidade: 'barra', estoqueAtual: 4, estoqueMinimo: 10, localizacao: 'Almoxarifado', observacoes: 'Estoque baixo' },
  { id: 'm7', obraId: 'ob1', nome: 'Eletroduto 3/4"', categoria: 'Elétrica', unidade: 'barra', estoqueAtual: 18, estoqueMinimo: 15, localizacao: 'Almoxarifado', observacoes: '' },
  { id: 'm8', obraId: 'ob1', nome: 'Fio 2,5mm² azul', categoria: 'Elétrica', unidade: 'rolo', estoqueAtual: 3, estoqueMinimo: 3, localizacao: 'Almoxarifado', observacoes: '' },
  // Obra 3 – materiais restantes pós-obra
  { id: 'm9', obraId: 'ob3', nome: 'Tinta acrílica branca 18L', categoria: 'Pintura', unidade: 'lata', estoqueAtual: 2, estoqueMinimo: 0, localizacao: 'Depósito', observacoes: 'Sobra da obra' },
  { id: 'm10', obraId: 'ob3', nome: 'Massa corrida PVA 25kg', categoria: 'Pintura', unidade: 'lata', estoqueAtual: 1, estoqueMinimo: 0, localizacao: 'Depósito', observacoes: 'Sobra da obra' },
];

// ── Mock Movimentações ──
export const mockMovimentacoes: MovimentacaoEstoque[] = [
  { id: 'mv1', obraId: 'ob1', materialId: 'm1', materialNome: 'Cimento CP-II 50kg', tipo: 'entrada', data: '2026-03-25', quantidade: 50, origemDestino: 'Depósito Central', responsavel: 'José Silva', observacoes: 'NF 8901' },
  { id: 'mv2', obraId: 'ob1', materialId: 'm1', materialNome: 'Cimento CP-II 50kg', tipo: 'saida', data: '2026-04-01', quantidade: 12, origemDestino: 'Chapisco interno 1º pav', responsavel: 'José Silva', observacoes: '' },
  { id: 'mv3', obraId: 'ob1', materialId: 'm6', materialNome: 'Tubo PVC 100mm esgoto', tipo: 'saida', data: '2026-03-31', quantidade: 4, origemDestino: 'Hidráulica banheiros 2º pav', responsavel: 'José Silva', observacoes: '' },
  { id: 'mv4', obraId: 'ob1', materialId: 'm8', materialNome: 'Fio 2,5mm² azul', tipo: 'saida', data: '2026-03-28', quantidade: 2, origemDestino: 'Fiação elétrica térreo', responsavel: 'José Silva', observacoes: '' },
  { id: 'mv5', obraId: 'ob1', materialId: 'm4', materialNome: 'Aço CA-50 10mm', tipo: 'entrada', data: '2026-03-10', quantidade: 60, origemDestino: 'Gerdau Distribuidora', responsavel: 'José Silva', observacoes: 'NF 7891' },
  { id: 'mv6', obraId: 'ob3', materialId: 'm9', materialNome: 'Tinta acrílica branca 18L', tipo: 'entrada', data: '2025-06-15', quantidade: 8, origemDestino: 'Tintas MC', responsavel: 'Ricardo Ferreira', observacoes: 'NF 2201' },
  { id: 'mv7', obraId: 'ob3', materialId: 'm9', materialNome: 'Tinta acrílica branca 18L', tipo: 'saida', data: '2025-07-20', quantidade: 6, origemDestino: 'Pintura geral da clínica', responsavel: 'Ricardo Ferreira', observacoes: '' },
];

// ── Helpers ──
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (date: string) => {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
};

export const statusObraLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

export const statusEtapaLabels: Record<string, string> = {
  nao_iniciada: 'Não Iniciada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
};

export const statusDiarioLabels: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export const climaLabels: Record<string, string> = {
  sol: '☀️ Sol',
  nublado: '⛅ Nublado',
  chuva: '🌧️ Chuva',
  chuvoso_forte: '⛈️ Chuva Forte',
};
