// Catálogo de insumos comuns em construção civil
// Organizado por categoria para sugestão automática

export interface InsumoTemplate {
  descricao: string;
  unidade: string;
  etapaRef: string; // nome da categoria associada
}

export const catalogoInsumos: InsumoTemplate[] = [
  // --- Serviços Preliminares ---
  { descricao: 'Limpeza do terreno', unidade: 'm²', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Locação da obra', unidade: 'm²', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Tapume de proteção', unidade: 'm', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Barracão de obra', unidade: 'un', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Ligação provisória de energia', unidade: 'vb', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Ligação provisória de água', unidade: 'vb', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Placa de identificação da obra', unidade: 'un', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Instalação de container de obra', unidade: 'un', etapaRef: 'Serviços Preliminares' },
  { descricao: 'Banheiro químico (locação mensal)', unidade: 'mês', etapaRef: 'Serviços Preliminares' },

  // --- Fundação ---
  { descricao: 'Escavação manual de valas', unidade: 'm³', etapaRef: 'Fundação' },
  { descricao: 'Escavação mecânica', unidade: 'm³', etapaRef: 'Fundação' },
  { descricao: 'Aterro compactado', unidade: 'm³', etapaRef: 'Fundação' },
  { descricao: 'Lastro de concreto magro', unidade: 'm³', etapaRef: 'Fundação' },
  { descricao: 'Concreto para sapata', unidade: 'm³', etapaRef: 'Fundação' },
  { descricao: 'Forma para fundação', unidade: 'm²', etapaRef: 'Fundação' },
  { descricao: 'Armação de aço CA-50', unidade: 'kg', etapaRef: 'Fundação' },
  { descricao: 'Armação de aço CA-60', unidade: 'kg', etapaRef: 'Fundação' },
  { descricao: 'Estaca pré-moldada', unidade: 'm', etapaRef: 'Fundação' },
  { descricao: 'Broca de concreto armado', unidade: 'un', etapaRef: 'Fundação' },
  { descricao: 'Impermeabilização de fundação', unidade: 'm²', etapaRef: 'Fundação' },
  { descricao: 'Radier de concreto', unidade: 'm³', etapaRef: 'Fundação' },
  { descricao: 'Viga baldrame', unidade: 'm³', etapaRef: 'Fundação' },

  // --- Estrutura ---
  { descricao: 'Concreto usinado fck 25 MPa', unidade: 'm³', etapaRef: 'Estrutura' },
  { descricao: 'Concreto usinado fck 30 MPa', unidade: 'm³', etapaRef: 'Estrutura' },
  { descricao: 'Forma de madeira para pilar', unidade: 'm²', etapaRef: 'Estrutura' },
  { descricao: 'Forma de madeira para viga', unidade: 'm²', etapaRef: 'Estrutura' },
  { descricao: 'Forma de madeira para laje', unidade: 'm²', etapaRef: 'Estrutura' },
  { descricao: 'Armação de aço CA-50 para estrutura', unidade: 'kg', etapaRef: 'Estrutura' },
  { descricao: 'Laje pré-moldada treliçada', unidade: 'm²', etapaRef: 'Estrutura' },
  { descricao: 'Escoramento metálico (locação)', unidade: 'm²', etapaRef: 'Estrutura' },
  { descricao: 'Lançamento e adensamento de concreto', unidade: 'm³', etapaRef: 'Estrutura' },
  { descricao: 'Cura do concreto', unidade: 'm²', etapaRef: 'Estrutura' },
  { descricao: 'Estrutura metálica', unidade: 'kg', etapaRef: 'Estrutura' },

  // --- Alvenaria ---
  { descricao: 'Bloco cerâmico 9x14x19 cm', unidade: 'un', etapaRef: 'Alvenaria' },
  { descricao: 'Bloco cerâmico 14x19x29 cm', unidade: 'un', etapaRef: 'Alvenaria' },
  { descricao: 'Bloco de concreto 14x19x39 cm', unidade: 'un', etapaRef: 'Alvenaria' },
  { descricao: 'Bloco de concreto 19x19x39 cm', unidade: 'un', etapaRef: 'Alvenaria' },
  { descricao: 'Argamassa de assentamento', unidade: 'saco', etapaRef: 'Alvenaria' },
  { descricao: 'Execução de alvenaria meia vez', unidade: 'm²', etapaRef: 'Alvenaria' },
  { descricao: 'Execução de alvenaria uma vez', unidade: 'm²', etapaRef: 'Alvenaria' },
  { descricao: 'Verga e contra-verga', unidade: 'm', etapaRef: 'Alvenaria' },
  { descricao: 'Cinta de amarração', unidade: 'm', etapaRef: 'Alvenaria' },
  { descricao: 'Cimento Portland CP-II (50kg)', unidade: 'saco', etapaRef: 'Alvenaria' },
  { descricao: 'Areia média', unidade: 'm³', etapaRef: 'Alvenaria' },
  { descricao: 'Cal hidratada', unidade: 'saco', etapaRef: 'Alvenaria' },

  // --- Cobertura ---
  { descricao: 'Estrutura de madeira para telhado', unidade: 'm²', etapaRef: 'Cobertura' },
  { descricao: 'Telha cerâmica colonial', unidade: 'un', etapaRef: 'Cobertura' },
  { descricao: 'Telha de fibrocimento', unidade: 'm²', etapaRef: 'Cobertura' },
  { descricao: 'Telha sanduíche termoacústica', unidade: 'm²', etapaRef: 'Cobertura' },
  { descricao: 'Telha metálica galvanizada', unidade: 'm²', etapaRef: 'Cobertura' },
  { descricao: 'Cumeeira cerâmica', unidade: 'un', etapaRef: 'Cobertura' },
  { descricao: 'Calha de chapa galvanizada', unidade: 'm', etapaRef: 'Cobertura' },
  { descricao: 'Rufo metálico', unidade: 'm', etapaRef: 'Cobertura' },
  { descricao: 'Manta asfáltica para cobertura', unidade: 'm²', etapaRef: 'Cobertura' },
  { descricao: 'Impermeabilização de laje de cobertura', unidade: 'm²', etapaRef: 'Cobertura' },

  // --- Instalações Elétricas ---
  { descricao: 'Eletroduto PVC 3/4"', unidade: 'm', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Eletroduto PVC 1"', unidade: 'm', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 2,5mm²', unidade: 'm', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 4,0mm²', unidade: 'm', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 6,0mm²', unidade: 'm', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 10,0mm²', unidade: 'm', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Quadro de distribuição', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Disjuntor monopolar', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Disjuntor bipolar', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Tomada 2P+T 10A', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Tomada 2P+T 20A', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Interruptor simples', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Interruptor duplo', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Luminária de embutir LED', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Ponto de iluminação', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Ponto de tomada', unidade: 'un', etapaRef: 'Instalações Elétricas' },
  { descricao: 'Aterramento com haste cobreada', unidade: 'un', etapaRef: 'Instalações Elétricas' },

  // --- Instalações Hidráulicas ---
  { descricao: 'Tubo PVC soldável 25mm', unidade: 'm', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC soldável 32mm', unidade: 'm', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC soldável 50mm', unidade: 'm', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC esgoto 100mm', unidade: 'm', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC esgoto 150mm', unidade: 'm', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Conexões PVC (joelho, tê, luva)', unidade: 'vb', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Registro de gaveta 3/4"', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Registro de pressão 3/4"', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa d\'água 1000L', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa d\'água 500L', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa de gordura', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa de inspeção', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Ralo sifonado 100mm', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PPR (água quente) 25mm', unidade: 'm', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Ponto de água fria', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },
  { descricao: 'Ponto de esgoto', unidade: 'un', etapaRef: 'Instalações Hidráulicas' },

  // --- Revestimentos ---
  { descricao: 'Chapisco interno', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Chapisco externo', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Emboço interno', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Emboço externo', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Reboco interno', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Argamassa industrializada', unidade: 'saco', etapaRef: 'Revestimentos' },
  { descricao: 'Gesso liso', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Forro de gesso acartonado', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Forro de PVC', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Revestimento cerâmico de parede', unidade: 'm²', etapaRef: 'Revestimentos' },
  { descricao: 'Argamassa colante AC-I', unidade: 'saco', etapaRef: 'Revestimentos' },
  { descricao: 'Argamassa colante AC-II', unidade: 'saco', etapaRef: 'Revestimentos' },
  { descricao: 'Argamassa colante AC-III', unidade: 'saco', etapaRef: 'Revestimentos' },
  { descricao: 'Rejunte', unidade: 'kg', etapaRef: 'Revestimentos' },

  // --- Pisos ---
  { descricao: 'Contrapiso de concreto', unidade: 'm²', etapaRef: 'Pisos' },
  { descricao: 'Piso cerâmico', unidade: 'm²', etapaRef: 'Pisos' },
  { descricao: 'Porcelanato polido', unidade: 'm²', etapaRef: 'Pisos' },
  { descricao: 'Porcelanato acetinado', unidade: 'm²', etapaRef: 'Pisos' },
  { descricao: 'Piso vinílico', unidade: 'm²', etapaRef: 'Pisos' },
  { descricao: 'Piso laminado', unidade: 'm²', etapaRef: 'Pisos' },
  { descricao: 'Piso intertravado', unidade: 'm²', etapaRef: 'Pisos' },
  { descricao: 'Rodapé cerâmico', unidade: 'm', etapaRef: 'Pisos' },
  { descricao: 'Soleira de granito', unidade: 'm', etapaRef: 'Pisos' },
  { descricao: 'Peitoril de granito', unidade: 'm', etapaRef: 'Pisos' },
  { descricao: 'Piso de concreto polido', unidade: 'm²', etapaRef: 'Pisos' },

  // --- Pintura ---
  { descricao: 'Massa corrida PVA', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Massa acrílica', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Selador PVA', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Selador acrílico', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Pintura látex PVA interna', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Pintura acrílica externa', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Textura acrílica', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Pintura esmalte em madeira', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Pintura esmalte em metal', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Verniz para madeira', unidade: 'm²', etapaRef: 'Pintura' },
  { descricao: 'Tinta epóxi para piso', unidade: 'm²', etapaRef: 'Pintura' },

  // --- Esquadrias ---
  { descricao: 'Porta de madeira interna 80x210 cm', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Porta de madeira externa 90x210 cm', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Kit porta pronta', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Janela de alumínio de correr', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Janela de alumínio maxim-ar', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Porta de alumínio de correr', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Porta de vidro temperado', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Fechadura interna', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Fechadura externa', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Dobradiça 3"', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Vidro temperado 8mm', unidade: 'm²', etapaRef: 'Esquadrias' },
  { descricao: 'Box de vidro temperado para banheiro', unidade: 'un', etapaRef: 'Esquadrias' },
  { descricao: 'Portão de garagem metálico', unidade: 'un', etapaRef: 'Esquadrias' },

  // --- Louças e Metais ---
  { descricao: 'Vaso sanitário com caixa acoplada', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Cuba de apoio para lavatório', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Cuba de embutir para cozinha', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Tanque de louça', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Torneira de mesa para cozinha', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Torneira de mesa para lavatório', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Chuveiro elétrico', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Ducha higiênica', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Bancada de granito', unidade: 'm', etapaRef: 'Louças e Metais' },
  { descricao: 'Papeleira', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Saboneteira', unidade: 'un', etapaRef: 'Louças e Metais' },
  { descricao: 'Acessórios para banheiro (kit)', unidade: 'un', etapaRef: 'Louças e Metais' },

  // --- Limpeza Final ---
  { descricao: 'Limpeza grossa da obra', unidade: 'm²', etapaRef: 'Limpeza Final' },
  { descricao: 'Limpeza fina da obra', unidade: 'm²', etapaRef: 'Limpeza Final' },
  { descricao: 'Remoção de entulho (caçamba)', unidade: 'un', etapaRef: 'Limpeza Final' },
  { descricao: 'Limpeza de vidros', unidade: 'm²', etapaRef: 'Limpeza Final' },

  // --- Locação de Equipamentos ---
  { descricao: 'Betoneira 400L (locação mensal)', unidade: 'mês', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Andaime metálico (locação mensal)', unidade: 'mês', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Vibrador de concreto (locação diária)', unidade: 'dia', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Escora metálica (locação mensal)', unidade: 'mês', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Guincho de coluna (locação mensal)', unidade: 'mês', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Retroescavadeira (locação por hora)', unidade: 'h', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Caminhão basculante (locação por dia)', unidade: 'dia', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Mini carregadeira (locação por dia)', unidade: 'dia', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Compactador de solo (locação diária)', unidade: 'dia', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Cortadora de piso (locação diária)', unidade: 'dia', etapaRef: 'Locação de Equipamentos' },
  { descricao: 'Bomba de concreto (locação por serviço)', unidade: 'vb', etapaRef: 'Locação de Equipamentos' },

  // --- Mão de Obra ---
  { descricao: 'Pedreiro (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Servente (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Eletricista (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Encanador (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Pintor (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Carpinteiro (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Armador (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Mestre de obras (mensal)', unidade: 'mês', etapaRef: 'Mão de Obra' },
  { descricao: 'Engenheiro responsável (mensal)', unidade: 'mês', etapaRef: 'Mão de Obra' },
  { descricao: 'Gesseiro (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Serralheiro (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Azulejista (diária)', unidade: 'dia', etapaRef: 'Mão de Obra' },
  { descricao: 'Marmorista (serviço)', unidade: 'vb', etapaRef: 'Mão de Obra' },

  // --- Impermeabilização ---
  { descricao: 'Manta asfáltica 3mm', unidade: 'm²', etapaRef: 'Impermeabilização' },
  { descricao: 'Manta asfáltica 4mm', unidade: 'm²', etapaRef: 'Impermeabilização' },
  { descricao: 'Impermeabilizante acrílico flexível', unidade: 'm²', etapaRef: 'Impermeabilização' },
  { descricao: 'Impermeabilizante cimentício', unidade: 'm²', etapaRef: 'Impermeabilização' },
  { descricao: 'Primer asfáltico', unidade: 'l', etapaRef: 'Impermeabilização' },
  { descricao: 'Teste de estanqueidade', unidade: 'vb', etapaRef: 'Impermeabilização' },

  // --- Projetos e Taxas ---
  { descricao: 'Projeto arquitetônico', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'Projeto estrutural', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'Projeto elétrico', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'Projeto hidrossanitário', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'Alvará de construção', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'ART/RRT', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'Habite-se', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'Topografia e levantamento', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
  { descricao: 'Sondagem de solo (SPT)', unidade: 'vb', etapaRef: 'Projetos e Taxas' },
];

// Additional categories not in the default list
export const etapasExtras = [
  { codigo: 'ETP-014', nome: 'Locação de Equipamentos' },
  { codigo: 'ETP-015', nome: 'Mão de Obra' },
  { codigo: 'ETP-016', nome: 'Impermeabilização' },
  { codigo: 'ETP-017', nome: 'Projetos e Taxas' },
];
