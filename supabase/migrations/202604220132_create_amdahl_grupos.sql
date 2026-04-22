-- Migration: Criação the Amdahl Grupos e vínculos estruturais

CREATE TABLE IF NOT EXISTS amdahl_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) DEFAULT NULL,
  nome text NOT NULL,
  descricao text,
  amdahl_p numeric NOT NULL DEFAULT 0.80,
  amdahl_f numeric NOT NULL DEFAULT 0.15,
  composicoes_sinapi jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE amdahl_grupos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para amdahl_grupos
CREATE POLICY "Leitura de grupos amdahl: global ou da empresa"
  ON amdahl_grupos FOR SELECT
  USING (
    company_id IS NULL OR company_id = get_user_company_id()
  );

CREATE POLICY "Escrita em grupos amdahl restrita à empresa"
  ON amdahl_grupos FOR ALL
  USING (
    company_id IS NOT NULL AND (
      company_id = get_user_company_id()
    )
  );

-- Garantir que orcamento composições tenha o grupo atrelado
ALTER TABLE orcamento_composicoes
  ADD COLUMN IF NOT EXISTS amdahl_grupo_id uuid REFERENCES amdahl_grupos(id);

-- Campos na tabela de tarefas do cronograma
ALTER TABLE cronograma_tarefas
  ADD COLUMN IF NOT EXISTS amdahl_grupo_id uuid REFERENCES amdahl_grupos(id),
  ADD COLUMN IF NOT EXISTS amdahl_equipe integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amdahl_metodo text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS amdahl_confianca numeric DEFAULT NULL;

-- -------------------------------------------------------------------------
-- SEED DE PERFIS DE SERVIÇO GLOBAIS (company_id = NULL)
-- -------------------------------------------------------------------------

INSERT INTO public.amdahl_grupos
  (nome, descricao, amdahl_p, amdahl_f, composicoes_sinapi, company_id)
VALUES
-- FUNDAÇÕES E MOVIMENTO DE TERRA
('Escavação manual de vala ou cava', 'Abertura manual de valas para fundações, redes e baldrames', 0.72, 0.18, '[]', NULL),
('Escavação mecanizada', 'Escavação com retroescavadeira, escavadeira hidráulica ou similar', 0.50, 0.30, '[]', NULL),
('Compactação de solo', 'Compactação manual ou mecanizada de aterro e base', 0.75, 0.15, '[]', NULL),
('Execução de estacas', 'Cravação ou perfuração de estacas (franki, hélice, raiz, mega)', 0.40, 0.38, '[]', NULL),
('Execução de tubulão', 'Escavação e concretagem de tubulões a céu aberto ou ar comprimido', 0.35, 0.42, '[]', NULL),
('Formas para fundação', 'Montagem e desmontagem de formas para sapatas, blocos e baldrames', 0.70, 0.20, '[]', NULL),
('Armação de fundação', 'Corte, dobra e montagem de armadura para sapatas, blocos e baldrames', 0.78, 0.16, '[]', NULL),
('Concretagem de fundação', 'Lançamento e adensamento de concreto em sapatas, blocos e baldrames', 0.62, 0.26, '[]', NULL),
('Impermeabilização de fundação', 'Aplicação de manta ou argamassa impermeabilizante em fundações enterradas', 0.78, 0.15, '[]', NULL),

-- ESTRUTURA DE CONCRETO
('Formas para pilar', 'Montagem e desmontagem de formas de madeira ou metálicas para pilares', 0.65, 0.26, '[]', NULL),
('Formas para viga', 'Montagem e desmontagem de formas para vigas e faixas', 0.68, 0.24, '[]', NULL),
('Formas para laje maciça ou nervurada', 'Escoramento, montagem de forma e cubetas para lajes', 0.72, 0.22, '[]', NULL),
('Armação de pilar', 'Corte, dobra, montagem e posicionamento de armadura de pilares', 0.72, 0.20, '[]', NULL),
('Armação de viga', 'Corte, dobra e montagem de armadura de vigas', 0.76, 0.18, '[]', NULL),
('Armação de laje', 'Distribuição e posicionamento de malha de aço em lajes', 0.82, 0.14, '[]', NULL),
('Concretagem de pilar', 'Lançamento e adensamento de concreto em pilares — espaço restrito', 0.52, 0.32, '[]', NULL),
('Concretagem de viga', 'Lançamento e adensamento de concreto em vigas', 0.58, 0.28, '[]', NULL),
('Concretagem de laje', 'Lançamento, adensamento e acabamento de laje — grande área paralela', 0.72, 0.22, '[]', NULL),
('Cura de concreto', 'Manutenção de umidade e proteção durante período de cura — atividade de espera', 0.30, 0.05, '[]', NULL),
('Desforma', 'Remoção de formas e escoramentos após cura', 0.80, 0.12, '[]', NULL),
('Montagem de estrutura metálica', 'Içamento, alinhamento e fixação de perfis e vigas de aço', 0.62, 0.28, '[]', NULL),
('Assentamento de laje pré-moldada', 'Posicionamento de lajotas ou placas alveolares e capeamento', 0.78, 0.16, '[]', NULL),

-- ALVENARIA
('Assentamento de blocos cerâmicos', 'Elevação de paredes com blocos cerâmicos furados — vedação ou estrutural', 0.85, 0.12, '[]', NULL),
('Assentamento de blocos de concreto', 'Elevação de paredes com blocos de concreto simples ou estrutural', 0.83, 0.13, '[]', NULL),
('Assentamento de tijolos maciços', 'Elevação de paredes com tijolos maciços cerâmicos', 0.84, 0.12, '[]', NULL),
('Execução de vergas e contravergas', 'Concretagem ou assentamento de vergas e contravergas em vãos', 0.68, 0.18, '[]', NULL),
('Montagem de drywall', 'Estrutura metálica e fixação de placas de gesso acartonado', 0.88, 0.10, '[]', NULL),
('Montagem de painel cimentício', 'Estrutura e fixação de painéis cimentícios externos ou internos', 0.85, 0.12, '[]', NULL),

-- COBERTURA
('Montagem de estrutura de madeira para telhado', 'Corte, encaixe e fixação de tesouras, caibros e ripas', 0.70, 0.22, '[]', NULL),
('Montagem de estrutura metálica para cobertura', 'Içamento e fixação de terças, treliças e perfis de aço', 0.65, 0.26, '[]', NULL),
('Assentamento de telhas cerâmicas', 'Fixação e rejuntamento de telhas cerâmicas sobre ripamento', 0.88, 0.10, '[]', NULL),
('Assentamento de telhas metálicas ou fibrocimento', 'Fixação de telhas trapezoidais, onduladas ou sanduíche', 0.90, 0.08, '[]', NULL),
('Impermeabilização de cobertura plana', 'Aplicação de manta asfáltica ou membrana em laje de cobertura', 0.80, 0.14, '[]', NULL),
('Rufos, calhas e condutores', 'Fabricação e instalação de rufos, calhas e descidas de água pluvial', 0.72, 0.18, '[]', NULL),

-- REVESTIMENTOS EXTERNOS
('Chapisco externo', 'Aplicação de chapisco em fachadas e paredes externas', 0.90, 0.08, '[]', NULL),
('Emboço e reboco externo', 'Aplicação de argamassa de regularização em fachadas', 0.85, 0.12, '[]', NULL),
('Assentamento de cerâmica ou porcelanato em fachada', 'Colagem e rejuntamento de revestimento cerâmico externo', 0.78, 0.16, '[]', NULL),
('Aplicação de textura acrílica', 'Textura de fachada — aplicação por rolo ou projeção', 0.88, 0.10, '[]', NULL),
('Pintura de fachada', 'Pintura látex ou acrílica em superfícies externas', 0.88, 0.10, '[]', NULL),
('Sistema EIFS ou fachada ventilada', 'Fixação de isolamento, perfis e revestimento em sistema composto', 0.68, 0.22, '[]', NULL),

-- REVESTIMENTOS INTERNOS — PAREDES
('Chapisco interno', 'Aplicação de chapisco em paredes internas antes do reboco', 0.92, 0.07, '[]', NULL),
('Emboço e reboco interno', 'Aplicação de argamassa de regularização em paredes internas', 0.88, 0.10, '[]', NULL),
('Aplicação de massa corrida ou gesso liso', 'Acabamento de superfície com massa ou gesso antes da pintura', 0.90, 0.08, '[]', NULL),
('Assentamento de cerâmica interna em parede', 'Colagem e rejuntamento de cerâmica em paredes de banheiro e cozinha', 0.85, 0.12, '[]', NULL),
('Assentamento de porcelanato em parede', 'Colagem e rejuntamento de porcelanato em paredes', 0.82, 0.14, '[]', NULL),

-- PISOS
('Execução de lastro de concreto', 'Lançamento e nivelamento de lastro ou contrapiso', 0.80, 0.14, '[]', NULL),
('Regularização e desempeno de contrapiso', 'Execução de contrapiso com desempeno mecânico ou manual', 0.82, 0.13, '[]', NULL),
('Assentamento de cerâmica em piso', 'Colagem e rejuntamento de piso cerâmico', 0.88, 0.10, '[]', NULL),
('Assentamento de porcelanato em piso', 'Colagem e rejuntamento de porcelanato em piso — maior precisão', 0.85, 0.12, '[]', NULL),
('Instalação de piso vinílico ou laminado', 'Fixação de réguas vinílicas, laminadas ou emborrachadas', 0.90, 0.08, '[]', NULL),
('Assentamento de piso de madeira', 'Colagem ou encaixe de taco, régua ou deck de madeira', 0.85, 0.12, '[]', NULL),
('Polimento de piso de concreto', 'Polimento e cristalização de piso de concreto', 0.82, 0.13, '[]', NULL),
('Aplicação de epóxi em piso', 'Preparo de base e aplicação de revestimento epóxi', 0.80, 0.15, '[]', NULL),
('Assentamento de rodapé', 'Fixação de rodapés cerâmicos, madeira ou MDF', 0.85, 0.10, '[]', NULL),

-- FORRO
('Forro de gesso em placa', 'Montagem de estrutura e fixação de placas de gesso', 0.85, 0.12, '[]', NULL),
('Forro de PVC', 'Montagem de perfis e encaixe de réguas de PVC', 0.88, 0.10, '[]', NULL),
('Forro de madeira ou lambri', 'Estrutura e fixação de forro de madeira', 0.83, 0.13, '[]', NULL),
('Forro mineral ou isopor', 'Montagem de estrutura e assentamento de placas minerais', 0.87, 0.10, '[]', NULL),

-- PINTURA INTERNA
('Pintura interna em parede — látex ou acrílica', 'Aplicação de tinta em paredes internas — grande área paralela', 0.92, 0.07, '[]', NULL),
('Pintura de teto', 'Aplicação de tinta em tetos — trabalho em altura, mais lento', 0.88, 0.10, '[]', NULL),
('Pintura de esquadria de madeira', 'Lixamento, selador e pintura de portas e batentes', 0.80, 0.14, '[]', NULL),
('Verniz e stain em madeira', 'Tratamento e acabamento de superfícies de madeira aparente', 0.82, 0.12, '[]', NULL),

-- INSTALAÇÕES HIDROSSANITÁRIAS
('Passagem de tubulação de esgoto embutida', 'Corte, passagem e fixação de tubos PVC esgoto em alvenaria', 0.55, 0.28, '[]', NULL),
('Passagem de tubulação de água fria embutida', 'Corte, passagem e fixação de tubos PVC ou CPVC água fria', 0.58, 0.26, '[]', NULL),
('Passagem de tubulação de água quente', 'Corte, passagem e fixação de tubos CPVC ou PPR água quente', 0.55, 0.28, '[]', NULL),
('Instalação de louças e metais sanitários', 'Fixação de vasos, cubas, torneiras, chuveiros e acessórios', 0.65, 0.20, '[]', NULL),
('Instalação de caixa dágua e reservatório', 'Posicionamento, ligação e vedação de reservatórios', 0.58, 0.24, '[]', NULL),
('Impermeabilização de áreas molhadas', 'Aplicação de argamassa ou manta em banheiros e áreas de serviço', 0.78, 0.16, '[]', NULL),
('Instalação de sistema de aquecimento solar', 'Fixação de coletores, reservatório e tubulação de aquecimento', 0.55, 0.28, '[]', NULL),

-- INSTALAÇÕES ELÉTRICAS
('Passagem de eletroduto embutido em alvenaria', 'Corte de rasgos, fixação de eletrodutos e caixas de passagem', 0.55, 0.28, '[]', NULL),
('Passagem de eletroduto em laje', 'Fixação de eletrodutos sobre fôrma antes da concretagem', 0.70, 0.18, '[]', NULL),
('Passagem de fiação', 'Enfiação de cabos em eletrodutos já instalados', 0.65, 0.20, '[]', NULL),
('Montagem de quadro de distribuição', 'Fixação, conexão e identificação de disjuntores e barramentos', 0.40, 0.35, '[]', NULL),
('Instalação de tomadas e interruptores', 'Conexão e fixação de pontos de tomada e interrupção', 0.68, 0.20, '[]', NULL),
('Instalação de luminárias e pontos de luz', 'Fixação e conexão de luminárias, spots e arandelas', 0.70, 0.20, '[]', NULL),
('Instalação de SPDA (para-raios)', 'Fixação de captores, descidas e aterramento', 0.58, 0.26, '[]', NULL),
('Instalação de CFTV e automação', 'Passagem de cabeamento estruturado e fixação de equipamentos', 0.52, 0.30, '[]', NULL),

-- INSTALAÇÕES ESPECIAIS
('Instalação de ar condicionado split', 'Fixação de unidades, passagem de cobre e dreno, carga de gás', 0.60, 0.25, '[]', NULL),
('Instalação de tubulação de gás', 'Passagem, fixação e teste de tubulação de gás natural ou GLP', 0.52, 0.30, '[]', NULL),
('Instalação de sistema de incêndio', 'Passagem de tubulação, fixação de sprinklers e hidrantes', 0.55, 0.28, '[]', NULL),
('Instalação de elevador', 'Montagem de trilhos, cabine, maquinário e testes', 0.32, 0.42, '[]', NULL),

-- ESQUADRIAS
('Instalação de esquadria de alumínio', 'Fixação de frames, caixilhos e vidros de alumínio', 0.65, 0.22, '[]', NULL),
('Instalação de porta de madeira', 'Fixação de batentes, alisares e folhas de madeira', 0.72, 0.18, '[]', NULL),
('Instalação de vidro temperado ou laminado', 'Fixação de vidros, ferragens e silicone estrutural', 0.60, 0.26, '[]', NULL),
('Instalação de portão automático', 'Fixação de estrutura, motor, trilho e automação', 0.55, 0.28, '[]', NULL),

-- EXTERNAS E INFRAESTRUTURA
('Execução de calçada e passeio', 'Preparo de base, formas e concretagem de calçadas', 0.82, 0.12, '[]', NULL),
('Execução de pavimentação interna', 'Compactação, base, sub-base e revestimento de pátios e ruas internas', 0.68, 0.22, '[]', NULL),
('Execução de drenagem superficial', 'Escavação, assentamento de tubos e caixas de drenagem', 0.65, 0.22, '[]', NULL),
('Execução de muro de arrimo', 'Formas, armação e concretagem de muro de contenção', 0.62, 0.26, '[]', NULL),
('Paisagismo e jardinagem', 'Preparo de solo, plantio de grama, plantas e árvores', 0.88, 0.08, '[]', NULL),
('Execução de piscina', 'Escavação, formas, armação, impermeabilização e acabamento de piscina', 0.55, 0.30, '[]', NULL),

-- DEMOLIÇÃO E REFORMA
('Demolição manual de alvenaria', 'Quebra e remoção de paredes, pisos e revestimentos', 0.80, 0.15, '[]', NULL),
('Remoção de revestimento cerâmico', 'Retirada mecânica de cerâmica de pisos e paredes', 0.82, 0.13, '[]', NULL),
('Remoção de cobertura existente', 'Desmontagem de estrutura e telhas de telhado', 0.75, 0.18, '[]', NULL),

-- LIMPEZA, CANTEIRO E ENCERRAMENTO
('Mobilização e instalação do canteiro', 'Montagem de tapumes, barracão, instalações provisórias', 0.60, 0.20, '[]', NULL),
('Limpeza grossa de obra', 'Remoção de entulho, varrição e retirada de resíduos', 0.90, 0.07, '[]', NULL),
('Limpeza fina para entrega', 'Limpeza de pisos, vidros, esquadrias e acabamentos', 0.92, 0.06, '[]', NULL),
('Desmobilização do canteiro', 'Remoção de tapumes, barracão e limpeza final do terreno', 0.65, 0.18, '[]', NULL),
('Vistoria e regularização', 'Vistorias técnicas, habite-se e regularização documental', 0.30, 0.10, '[]', NULL);
