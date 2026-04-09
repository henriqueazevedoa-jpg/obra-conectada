// Catálogo de insumos comuns em construção civil
// Organizado por categoria para sugestão automática

export interface InsumoTemplate {
  descricao: string;
  unidade: string;
  categoriaRef: string; // nome da categoria associada
}

export const catalogoInsumos: InsumoTemplate[] = [
  // --- Serviços Preliminares ---
  { descricao: 'Limpeza do terreno', unidade: 'm²', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Locação da obra', unidade: 'm²', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Tapume de proteção', unidade: 'm', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Barracão de obra', unidade: 'un', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Ligação provisória de energia', unidade: 'vb', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Ligação provisória de água', unidade: 'vb', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Placa de identificação da obra', unidade: 'un', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Instalação de container de obra', unidade: 'un', categoriaRef: 'Serviços Preliminares' },
  { descricao: 'Banheiro químico (locação mensal)', unidade: 'mês', categoriaRef: 'Serviços Preliminares' },

  // --- Fundação ---
  { descricao: 'Escavação manual de valas', unidade: 'm³', categoriaRef: 'Fundação' },
  { descricao: 'Escavação mecânica', unidade: 'm³', categoriaRef: 'Fundação' },
  { descricao: 'Aterro compactado', unidade: 'm³', categoriaRef: 'Fundação' },
  { descricao: 'Lastro de concreto magro', unidade: 'm³', categoriaRef: 'Fundação' },
  { descricao: 'Concreto para sapata', unidade: 'm³', categoriaRef: 'Fundação' },
  { descricao: 'Forma para fundação', unidade: 'm²', categoriaRef: 'Fundação' },
  { descricao: 'Armação de aço CA-50', unidade: 'kg', categoriaRef: 'Fundação' },
  { descricao: 'Armação de aço CA-60', unidade: 'kg', categoriaRef: 'Fundação' },
  { descricao: 'Estaca pré-moldada', unidade: 'm', categoriaRef: 'Fundação' },
  { descricao: 'Broca de concreto armado', unidade: 'un', categoriaRef: 'Fundação' },
  { descricao: 'Impermeabilização de fundação', unidade: 'm²', categoriaRef: 'Fundação' },
  { descricao: 'Radier de concreto', unidade: 'm³', categoriaRef: 'Fundação' },
  { descricao: 'Viga baldrame', unidade: 'm³', categoriaRef: 'Fundação' },

  // --- Estrutura ---
  { descricao: 'Concreto usinado fck 25 MPa', unidade: 'm³', categoriaRef: 'Estrutura' },
  { descricao: 'Concreto usinado fck 30 MPa', unidade: 'm³', categoriaRef: 'Estrutura' },
  { descricao: 'Forma de madeira para pilar', unidade: 'm²', categoriaRef: 'Estrutura' },
  { descricao: 'Forma de madeira para viga', unidade: 'm²', categoriaRef: 'Estrutura' },
  { descricao: 'Forma de madeira para laje', unidade: 'm²', categoriaRef: 'Estrutura' },
  { descricao: 'Armação de aço CA-50 para estrutura', unidade: 'kg', categoriaRef: 'Estrutura' },
  { descricao: 'Laje pré-moldada treliçada', unidade: 'm²', categoriaRef: 'Estrutura' },
  { descricao: 'Escoramento metálico (locação)', unidade: 'm²', categoriaRef: 'Estrutura' },
  { descricao: 'Lançamento e adensamento de concreto', unidade: 'm³', categoriaRef: 'Estrutura' },
  { descricao: 'Cura do concreto', unidade: 'm²', categoriaRef: 'Estrutura' },
  { descricao: 'Estrutura metálica', unidade: 'kg', categoriaRef: 'Estrutura' },

  // --- Alvenaria ---
  { descricao: 'Bloco cerâmico 9x14x19 cm', unidade: 'un', categoriaRef: 'Alvenaria' },
  { descricao: 'Bloco cerâmico 14x19x29 cm', unidade: 'un', categoriaRef: 'Alvenaria' },
  { descricao: 'Bloco de concreto 14x19x39 cm', unidade: 'un', categoriaRef: 'Alvenaria' },
  { descricao: 'Bloco de concreto 19x19x39 cm', unidade: 'un', categoriaRef: 'Alvenaria' },
  { descricao: 'Argamassa de assentamento', unidade: 'saco', categoriaRef: 'Alvenaria' },
  { descricao: 'Execução de alvenaria meia vez', unidade: 'm²', categoriaRef: 'Alvenaria' },
  { descricao: 'Execução de alvenaria uma vez', unidade: 'm²', categoriaRef: 'Alvenaria' },
  { descricao: 'Verga e contra-verga', unidade: 'm', categoriaRef: 'Alvenaria' },
  { descricao: 'Cinta de amarração', unidade: 'm', categoriaRef: 'Alvenaria' },
  { descricao: 'Cimento Portland CP-II (50kg)', unidade: 'saco', categoriaRef: 'Alvenaria' },
  { descricao: 'Areia média', unidade: 'm³', categoriaRef: 'Alvenaria' },
  { descricao: 'Cal hidratada', unidade: 'saco', categoriaRef: 'Alvenaria' },

  // --- Cobertura ---
  { descricao: 'Estrutura de madeira para telhado', unidade: 'm²', categoriaRef: 'Cobertura' },
  { descricao: 'Telha cerâmica colonial', unidade: 'un', categoriaRef: 'Cobertura' },
  { descricao: 'Telha de fibrocimento', unidade: 'm²', categoriaRef: 'Cobertura' },
  { descricao: 'Telha sanduíche termoacústica', unidade: 'm²', categoriaRef: 'Cobertura' },
  { descricao: 'Telha metálica galvanizada', unidade: 'm²', categoriaRef: 'Cobertura' },
  { descricao: 'Cumeeira cerâmica', unidade: 'un', categoriaRef: 'Cobertura' },
  { descricao: 'Calha de chapa galvanizada', unidade: 'm', categoriaRef: 'Cobertura' },
  { descricao: 'Rufo metálico', unidade: 'm', categoriaRef: 'Cobertura' },
  { descricao: 'Manta asfáltica para cobertura', unidade: 'm²', categoriaRef: 'Cobertura' },
  { descricao: 'Impermeabilização de laje de cobertura', unidade: 'm²', categoriaRef: 'Cobertura' },

  // --- Instalações Elétricas ---
  { descricao: 'Eletroduto PVC 3/4"', unidade: 'm', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Eletroduto PVC 1"', unidade: 'm', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 2,5mm²', unidade: 'm', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 4,0mm²', unidade: 'm', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 6,0mm²', unidade: 'm', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Cabo flexível 10,0mm²', unidade: 'm', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Quadro de distribuição', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Disjuntor monopolar', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Disjuntor bipolar', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Tomada 2P+T 10A', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Tomada 2P+T 20A', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Interruptor simples', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Interruptor duplo', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Luminária de embutir LED', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Ponto de iluminação', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Ponto de tomada', unidade: 'un', categoriaRef: 'Instalações Elétricas' },
  { descricao: 'Aterramento com haste cobreada', unidade: 'un', categoriaRef: 'Instalações Elétricas' },

  // --- Instalações Hidráulicas ---
  { descricao: 'Tubo PVC soldável 25mm', unidade: 'm', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC soldável 32mm', unidade: 'm', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC soldável 50mm', unidade: 'm', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC esgoto 100mm', unidade: 'm', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PVC esgoto 150mm', unidade: 'm', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Conexões PVC (joelho, tê, luva)', unidade: 'vb', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Registro de gaveta 3/4"', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Registro de pressão 3/4"', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa d\'água 1000L', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa d\'água 500L', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa de gordura', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Caixa de inspeção', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Ralo sifonado 100mm', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Tubo PPR (água quente) 25mm', unidade: 'm', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Ponto de água fria', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },
  { descricao: 'Ponto de esgoto', unidade: 'un', categoriaRef: 'Instalações Hidráulicas' },

  // --- Revestimentos ---
  { descricao: 'Chapisco interno', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Chapisco externo', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Emboço interno', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Emboço externo', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Reboco interno', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Argamassa industrializada', unidade: 'saco', categoriaRef: 'Revestimentos' },
  { descricao: 'Gesso liso', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Forro de gesso acartonado', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Forro de PVC', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Revestimento cerâmico de parede', unidade: 'm²', categoriaRef: 'Revestimentos' },
  { descricao: 'Argamassa colante AC-I', unidade: 'saco', categoriaRef: 'Revestimentos' },
  { descricao: 'Argamassa colante AC-II', unidade: 'saco', categoriaRef: 'Revestimentos' },
  { descricao: 'Argamassa colante AC-III', unidade: 'saco', categoriaRef: 'Revestimentos' },
  { descricao: 'Rejunte', unidade: 'kg', categoriaRef: 'Revestimentos' },

  // --- Pisos ---
  { descricao: 'Contrapiso de concreto', unidade: 'm²', categoriaRef: 'Pisos' },
  { descricao: 'Piso cerâmico', unidade: 'm²', categoriaRef: 'Pisos' },
  { descricao: 'Porcelanato polido', unidade: 'm²', categoriaRef: 'Pisos' },
  { descricao: 'Porcelanato acetinado', unidade: 'm²', categoriaRef: 'Pisos' },
  { descricao: 'Piso vinílico', unidade: 'm²', categoriaRef: 'Pisos' },
  { descricao: 'Piso laminado', unidade: 'm²', categoriaRef: 'Pisos' },
  { descricao: 'Piso intertravado', unidade: 'm²', categoriaRef: 'Pisos' },
  { descricao: 'Rodapé cerâmico', unidade: 'm', categoriaRef: 'Pisos' },
  { descricao: 'Soleira de granito', unidade: 'm', categoriaRef: 'Pisos' },
  { descricao: 'Peitoril de granito', unidade: 'm', categoriaRef: 'Pisos' },
  { descricao: 'Piso de concreto polido', unidade: 'm²', categoriaRef: 'Pisos' },

  // --- Pintura ---
  { descricao: 'Massa corrida PVA', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Massa acrílica', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Selador PVA', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Selador acrílico', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Pintura látex PVA interna', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Pintura acrílica externa', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Textura acrílica', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Pintura esmalte em madeira', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Pintura esmalte em metal', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Verniz para madeira', unidade: 'm²', categoriaRef: 'Pintura' },
  { descricao: 'Tinta epóxi para piso', unidade: 'm²', categoriaRef: 'Pintura' },

  // --- Esquadrias ---
  { descricao: 'Porta de madeira interna 80x210 cm', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Porta de madeira externa 90x210 cm', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Kit porta pronta', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Janela de alumínio de correr', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Janela de alumínio maxim-ar', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Porta de alumínio de correr', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Porta de vidro temperado', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Fechadura interna', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Fechadura externa', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Dobradiça 3"', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Vidro temperado 8mm', unidade: 'm²', categoriaRef: 'Esquadrias' },
  { descricao: 'Box de vidro temperado para banheiro', unidade: 'un', categoriaRef: 'Esquadrias' },
  { descricao: 'Portão de garagem metálico', unidade: 'un', categoriaRef: 'Esquadrias' },

  // --- Louças e Metais ---
  { descricao: 'Vaso sanitário com caixa acoplada', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Cuba de apoio para lavatório', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Cuba de embutir para cozinha', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Tanque de louça', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Torneira de mesa para cozinha', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Torneira de mesa para lavatório', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Chuveiro elétrico', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Ducha higiênica', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Bancada de granito', unidade: 'm', categoriaRef: 'Louças e Metais' },
  { descricao: 'Papeleira', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Saboneteira', unidade: 'un', categoriaRef: 'Louças e Metais' },
  { descricao: 'Acessórios para banheiro (kit)', unidade: 'un', categoriaRef: 'Louças e Metais' },

  // --- Limpeza Final ---
  { descricao: 'Limpeza grossa da obra', unidade: 'm²', categoriaRef: 'Limpeza Final' },
  { descricao: 'Limpeza fina da obra', unidade: 'm²', categoriaRef: 'Limpeza Final' },
  { descricao: 'Remoção de entulho (caçamba)', unidade: 'un', categoriaRef: 'Limpeza Final' },
  { descricao: 'Limpeza de vidros', unidade: 'm²', categoriaRef: 'Limpeza Final' },

  // --- Locação de Equipamentos ---
  { descricao: 'Betoneira 400L (locação mensal)', unidade: 'mês', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Andaime metálico (locação mensal)', unidade: 'mês', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Vibrador de concreto (locação diária)', unidade: 'dia', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Escora metálica (locação mensal)', unidade: 'mês', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Guincho de coluna (locação mensal)', unidade: 'mês', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Retroescavadeira (locação por hora)', unidade: 'h', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Caminhão basculante (locação por dia)', unidade: 'dia', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Mini carregadeira (locação por dia)', unidade: 'dia', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Compactador de solo (locação diária)', unidade: 'dia', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Cortadora de piso (locação diária)', unidade: 'dia', categoriaRef: 'Locação de Equipamentos' },
  { descricao: 'Bomba de concreto (locação por serviço)', unidade: 'vb', categoriaRef: 'Locação de Equipamentos' },

  // --- Mão de Obra ---
  { descricao: 'Pedreiro (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Servente (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Eletricista (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Encanador (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Pintor (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Carpinteiro (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Armador (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Mestre de obras (mensal)', unidade: 'mês', categoriaRef: 'Mão de Obra' },
  { descricao: 'Engenheiro responsável (mensal)', unidade: 'mês', categoriaRef: 'Mão de Obra' },
  { descricao: 'Gesseiro (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Serralheiro (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Azulejista (diária)', unidade: 'dia', categoriaRef: 'Mão de Obra' },
  { descricao: 'Marmorista (serviço)', unidade: 'vb', categoriaRef: 'Mão de Obra' },

  // --- Impermeabilização ---
  { descricao: 'Manta asfáltica 3mm', unidade: 'm²', categoriaRef: 'Impermeabilização' },
  { descricao: 'Manta asfáltica 4mm', unidade: 'm²', categoriaRef: 'Impermeabilização' },
  { descricao: 'Impermeabilizante acrílico flexível', unidade: 'm²', categoriaRef: 'Impermeabilização' },
  { descricao: 'Impermeabilizante cimentício', unidade: 'm²', categoriaRef: 'Impermeabilização' },
  { descricao: 'Primer asfáltico', unidade: 'l', categoriaRef: 'Impermeabilização' },
  { descricao: 'Teste de estanqueidade', unidade: 'vb', categoriaRef: 'Impermeabilização' },

  // --- Projetos e Taxas ---
  { descricao: 'Projeto arquitetônico', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'Projeto estrutural', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'Projeto elétrico', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'Projeto hidrossanitário', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'Alvará de construção', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'ART/RRT', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'Habite-se', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'Topografia e levantamento', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
  { descricao: 'Sondagem de solo (SPT)', unidade: 'vb', categoriaRef: 'Projetos e Taxas' },
];

// Additional categories not in the default list
export const categoriasExtras = [
  { codigo: 'CAT-014', nome: 'Locação de Equipamentos' },
  { codigo: 'CAT-015', nome: 'Mão de Obra' },
  { codigo: 'CAT-016', nome: 'Impermeabilização' },
  { codigo: 'CAT-017', nome: 'Projetos e Taxas' },
];
