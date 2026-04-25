const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const companyId = 'bbbbbbbb-0000-0000-0000-000000000001';

const obras = [
  { id: 'a1000000-0000-0000-0000-000000000001', versaoId: 'e1000000-0000-0000-0000-000000000001', prefix: '1' },
  { id: 'a2000000-0000-0000-0000-000000000001', versaoId: 'e2000000-0000-0000-0000-000000000001', prefix: '2' },
  { id: 'a3000000-0000-0000-0000-000000000001', versaoId: 'e3000000-0000-0000-0000-000000000001', prefix: '3' }
];
const oIds = obras.map(o => o.id);

const fornecedores = [
  { id: 'f1000000-0000-0000-0000-000000000001', nome: 'Depósito São Paulo Materiais de Construção', email: 'compras@depositosp.com.br', tel: '(11) 3333-1111' },
  { id: 'f2000000-0000-0000-0000-000000000001', nome: 'Aço & Cia Distribuidora', email: 'vendas@acoecia.com.br', tel: '(11) 4444-2222' },
  { id: 'f3000000-0000-0000-0000-000000000001', nome: 'ElétricMax Materiais Elétricos', email: 'eletricmax@email.com', tel: '(11) 5555-3333' },
  { id: 'f4000000-0000-0000-0000-000000000001', nome: 'HidroTech Tubos e Conexões', email: 'hidrotech@email.com', tel: '(11) 6666-4444' },
  { id: 'f5000000-0000-0000-0000-000000000001', nome: 'MadeiraMix Estruturas', email: 'madeiramix@email.com', tel: '(11) 7777-5555' }
];

let records = {
  contatos: [],
  orcamento_versoes: [],
  orcamento_categorias: [],
  orcamento_composicoes: [],
  orcamento_subitens: [],
  cotacao_lotes: [],
  cotacao_lote_itens: [],
  cotacao_respostas: []
};

fornecedores.forEach(f => {
  records.contatos.push({
    id: f.id, company_id: companyId, nome: f.nome, tipo: 'fornecedor_material', email: f.email, telefone: f.tel,
    created_at: new Date(), updated_at: new Date()
  });
});

const genId = (obraPfx, type, catIdx, compIdx, subIdx = 0) => {
  const pfx = type + obraPfx;
  const seq = String(catIdx).padStart(2, '0') + String(compIdx).padStart(2, '0') + String(subIdx).padStart(2, '0');
  return `${pfx}${seq}-0000-0000-0000-000000000001`;
};

const writeObra = (pfx, obraId, versaoId, totalVal, catList) => {
  records.orcamento_versoes.push({
    id: versaoId, obra_id: obraId, company_id: companyId, numero_versao: 'v1.0.0', tipo: 'analitico', status: 'ativo',
    valor_total: totalVal, created_at: new Date(), updated_at: new Date()
  });
  
  catList.forEach((cat, cIdx) => {
    const cid = genId(pfx, 'b', cIdx + 1, 0);
    const code = String(cIdx + 1).padStart(2, '0');
    records.orcamento_categorias.push({
      id: cid, obra_id: obraId, company_id: companyId, versao_id: versaoId, codigo: code, nome: cat.nome,
      preco_total: cat.total, usa_composicoes: true, status_cronograma: 'nao_iniciada', created_at: new Date(), updated_at: new Date()
    });
    
    cat.composicoes.forEach((comp, cpIdx) => {
      const compId = genId(pfx, 'c', cIdx + 1, cpIdx + 1);
      const cCode = `${code}.${String(cpIdx + 1).padStart(2, '0')}`;
      records.orcamento_composicoes.push({
        id: compId, etapa_id: cid, company_id: companyId, codigo: cCode, descricao: comp.desc, unidade: 'UN',
        quantidade: 1, preco_unitario: comp.total, preco_total: comp.total, usa_subitens: true, created_at: new Date(), updated_at: new Date()
      });
      
      comp.insumos.forEach((ins, sIdx) => {
        const subId = genId(pfx, 'd', cIdx + 1, cpIdx + 1, sIdx + 1);
        const precoTot = ins.qtd * ins.preco;
        const custUnit = ins.preco * 0.9;
        const custTot = ins.qtd * custUnit;
        records.orcamento_subitens.push({
          id: subId, composicao_id: compId, categoria_id: cid, company_id: companyId, nome: ins.nome, unidade: ins.un,
          quantidade: ins.qtd, preco_unitario: ins.preco, preco_total: precoTot, custo_unitario: custUnit, custo_total: custTot, created_at: new Date()
        });
      });
    });
  });
};

const genSimplifiedCategory = (name, comp1, comp2, insPrefix, catTotal) => ({
  nome: name, total: catTotal, composicoes: [
    { desc: comp1, total: catTotal * 0.6, insumos: [ { nome: insPrefix + ' A', un: 'un', qtd: 10, preco: (catTotal * 0.6) / 10 }, { nome: insPrefix + ' B', un: 'kg', qtd: 20, preco: 0 } ]},
    { desc: comp2, total: catTotal * 0.4, insumos: [ { nome: insPrefix + ' C', un: 'm', qtd: 15, preco: (catTotal * 0.4) / 15 }, { nome: insPrefix + ' D', un: 'h', qtd: 5, preco: 0 } ]}
  ]
});

const a1Categories = [
  { nome: 'Fundação', total: 30000, composicoes: [
    { desc: 'Escavação manual de valas', total: 5000, insumos: [ { nome: 'Servente', un: 'h', qtd: 100, preco: 18 }, { nome: 'Pá', un: 'un', qtd: 5, preco: 45 }, { nome: 'Picareta', un: 'un', qtd: 2, preco: 65 } ] },
    { desc: 'Radier em concreto fck 20MPa', total: 25000, insumos: [ { nome: 'Concreto usinado fck20', un: 'm³', qtd: 12, preco: 380 }, { nome: 'Tela soldada Q138', un: 'm²', qtd: 120, preco: 28 }, { nome: 'Espaçador plástico', un: 'un', qtd: 1000, preco: 0.8 } ] }
  ]},
  { nome: 'Estrutura', total: 60000, composicoes: [
    { desc: 'Pilares em concreto armado fck 25MPa', total: 25000, insumos: [ { nome: 'Concreto usinado fck25', un: 'm³', qtd: 15, preco: 480 }, { nome: 'Vergalhão CA-50 10mm', un: 'kg', qtd: 800, preco: 10.5 }, { nome: 'Forma de madeira', un: 'm²', qtd: 80, preco: 110 }, { nome: 'Arame recozido', un: 'kg', qtd: 20, preco: 30 } ] },
    { desc: 'Vigas e lajes', total: 35000, insumos: [ { nome: 'Concreto usinado fck25', un: 'm³', qtd: 25, preco: 480 }, { nome: 'Vergalhão CA-50 12.5mm', un: 'kg', qtd: 1200, preco: 10.5 }, { nome: 'Escoramento metálico', un: 'm²', qtd: 120, preco: 60 }, { nome: 'Forma de madeira', un: 'm²', qtd: 30, preco: 110 } ] }
  ]},
  { nome: 'Alvenaria', total: 40000, composicoes: [
    { desc: 'Alvenaria de vedação tijolo cerâmico 9x19x29', total: 35000, insumos: [ { nome: 'Tijolo cerâmico 9x19x29', un: 'un', qtd: 8000, preco: 1.2 }, { nome: 'Argamassa traço 1:2:8', un: 'm³', qtd: 5, preco: 500 }, { nome: 'Pedreiro', un: 'h', qtd: 400, preco: 35 }, { nome: 'Servente', un: 'h', qtd: 400, preco: 22 } ] },
    { desc: 'Vergas e contravergas', total: 5000, insumos: [ { nome: 'Concreto fck 15MPa', un: 'm³', qtd: 5, preco: 420 }, { nome: 'Vergalhão CA-50 6.3mm', un: 'kg', qtd: 150, preco: 8.5 } ] }
  ]},
  { nome: 'Cobertura', total: 35000, composicoes: [
    { desc: 'Estrutura de madeira para telhado', total: 15000, insumos: [ { nome: 'Caibro 6x6cm pinus', un: 'm', qtd: 200, preco: 15 }, { nome: 'Ripa 2.5x5cm pinus', un: 'm', qtd: 400, preco: 6 }, { nome: 'Viga 6x12cm pinus', un: 'm', qtd: 50, preco: 35 }, { nome: 'Prego 18x27', un: 'kg', qtd: 10, preco: 22 } ] },
    { desc: 'Telha cerâmica portuguesa', total: 20000, insumos: [ { nome: 'Telha cerâmica portuguesa', un: 'un', qtd: 3000, preco: 3.2 }, { nome: 'Cumeeira cerâmica', un: 'un', qtd: 150, preco: 9.5 }, { nome: 'Argamassa de assentamento', un: 'kg', qtd: 200, preco: 1.5 } ] }
  ]},
  { nome: 'Revestimentos', total: 45000, composicoes: [
    { desc: 'Chapisco e emboço interno', total: 20000, insumos: [ { nome: 'Cimento CP-II 50kg', un: 'sc', qtd: 40, preco: 45 }, { nome: 'Areia média lavada', un: 'm³', qtd: 15, preco: 110 }, { nome: 'Cal hidratada', un: 'sc', qtd: 30, preco: 32 }, { nome: 'Pedreiro', un: 'h', qtd: 200, preco: 35 }, { nome: 'Servente', un: 'h', qtd: 200, preco: 22 } ] },
    { desc: 'Cerâmica para piso interno 45x45', total: 25000, insumos: [ { nome: 'Cerâmica 45x45 esmaltada', un: 'm²', qtd: 130, preco: 55 }, { nome: 'Argamassa colante AC-I', un: 'sc', qtd: 50, preco: 35 }, { nome: 'Rejunte branco', un: 'kg', qtd: 15, preco: 9.5 }, { nome: 'Pedreiro', un: 'h', qtd: 150, preco: 35 } ] }
  ]},
  { nome: 'Instalações Elétricas', total: 25000, composicoes: [
    { desc: 'Eletrodutos e fiação', total: 15000, insumos: [ { nome: 'Eletroduto corrugado 25mm', un: 'm', qtd: 300, preco: 3.5 }, { nome: 'Fio 2.5mm²', un: 'm', qtd: 800, preco: 3.2 }, { nome: 'Fio 4mm²', un: 'm', qtd: 400, preco: 5.5 }, { nome: 'Caixa de passagem', un: 'un', qtd: 50, preco: 9 } ] },
    { desc: 'Quadro de distribuição e disjuntores', total: 10000, insumos: [ { nome: 'Quadro 12 disjuntores', un: 'un', qtd: 1, preco: 220 }, { nome: 'Disjuntor monopolar 16A', un: 'un', qtd: 8, preco: 35 }, { nome: 'Disjuntor bipolar 40A', un: 'un', qtd: 2, preco: 85 }, { nome: 'Eletricista', un: 'h', qtd: 40, preco: 55 } ] }
  ]},
  { nome: 'Instalações Hidráulicas', total: 25000, composicoes: [
    { desc: 'Tubulação de água fria PVC', total: 12000, insumos: [ { nome: 'Tubo PVC 25mm', un: 'm', qtd: 60, preco: 9.5 }, { nome: 'Tubo PVC 32mm', un: 'm', qtd: 20, preco: 14 }, { nome: 'Joelho 90° 25mm', un: 'un', qtd: 40, preco: 4.5 }, { nome: 'Registro de gaveta 25mm', un: 'un', qtd: 5, preco: 48 } ] },
    { desc: 'Tubulação de esgoto PVC', total: 13000, insumos: [ { nome: 'Tubo PVC esgoto 100mm', un: 'm', qtd: 30, preco: 25 }, { nome: 'Tubo PVC esgoto 75mm', un: 'm', qtd: 20, preco: 18 }, { nome: 'Joelho 45° 100mm', un: 'un', qtd: 15, preco: 14 }, { nome: 'Caixa sifonada', un: 'un', qtd: 4, preco: 45 } ] }
  ]},
  { nome: 'Pintura', total: 20000, composicoes: [
    { desc: 'Massa corrida PVA interna', total: 8000, insumos: [ { nome: 'Massa corrida PVA 25kg', un: 'gl', qtd: 10, preco: 75 }, { nome: 'Lixa 120', un: 'un', qtd: 50, preco: 4 }, { nome: 'Selador acrílico', un: 'gl', qtd: 3, preco: 55 }, { nome: 'Pintor', un: 'h', qtd: 80, preco: 40 } ] },
    { desc: 'Tinta acrílica acabamento interno', total: 12000, insumos: [ { nome: 'Tinta acrílica premium 18L', un: 'gl', qtd: 5, preco: 210 }, { nome: 'Rolo lã 23cm', un: 'un', qtd: 4, preco: 22 }, { nome: 'Bandeja plástica', un: 'un', qtd: 2, preco: 12 }, { nome: 'Pintor', un: 'h', qtd: 100, preco: 40 } ] }
  ]}
];

const a2Categories = [
  genSimplifiedCategory('Fundação', 'Estacas raiz', 'Blocos de coroamento', 'Insumo Fund', 100000),
  genSimplifiedCategory('Estrutura', 'Concreto protendido', 'Lajes nervuradas', 'Insumo Est', 250000),
  genSimplifiedCategory('Fachada', 'Revestimento ACM', 'Pele de vidro', 'Insumo Fachada', 150000),
  genSimplifiedCategory('Cobertura', 'Estrutura metálica', 'Telha termoacústica', 'Insumo Cob', 80000),
  genSimplifiedCategory('Revestimentos', 'Porcelanato', 'Piso elevado', 'Insumo Rev', 120000),
  genSimplifiedCategory('Elétrica', 'QGBT', 'SPDA', 'Insumo Ele', 60000),
  genSimplifiedCategory('Hidráulica', 'Bomba de recalque', 'Reservatório', 'Insumo Hid', 50000),
  genSimplifiedCategory('Pintura', 'Pintura epóxi piso', 'Pintura externa', 'Insumo Pint', 40000)
];

const a3Categories = [
  genSimplifiedCategory('Terraplanagem', 'Corte e aterro', 'Compactação', 'Insumo Terr', 80000),
  genSimplifiedCategory('Fundação', 'Sapatas isoladas', 'Vigas baldrame', 'Insumo Fund', 120000),
  genSimplifiedCategory('Estrutura', 'Pilares metálicos', 'Tesouras metálicas', 'Insumo Est', 350000),
  genSimplifiedCategory('Cobertura', 'Telha trapezoidal', 'Fechamento lateral', 'Insumo Cob', 200000),
  genSimplifiedCategory('Fechamento', 'Telha sanduíche', 'Mureta de bloco', 'Insumo Fech', 150000),
  genSimplifiedCategory('Piso', 'Concreto polido', 'Juntas de dilatação', 'Insumo Piso', 150000),
  genSimplifiedCategory('Elétrica', 'Painéis industriais', 'Iluminação LED galpão', 'Insumo Ele', 60000),
  genSimplifiedCategory('Hidráulica', 'Rede de incêndio', 'Águas pluviais', 'Insumo Hid', 90000)
];

writeObra('1', obras[0].id, obras[0].versaoId, 280000, a1Categories);
writeObra('2', obras[1].id, obras[1].versaoId, 850000, a2Categories);
writeObra('3', obras[2].id, obras[2].versaoId, 1200000, a3Categories);

const l1Id = '71000000-0000-0000-0000-000000000001';
const l2Id = '72000000-0000-0000-0000-000000000001';
const l3Id = '73000000-0000-0000-0000-000000000001';
const l4Id = '74000000-0000-0000-0000-000000000001';

records.cotacao_lotes.push({ id: l1Id, obra_id: obras[0].id, company_id: companyId, titulo: 'Lote 1 — Materiais Estruturais', status: 'finalizado', fase: 'execucao', created_at: new Date(), updated_at: new Date() });
records.cotacao_lotes.push({ id: l2Id, obra_id: obras[0].id, company_id: companyId, titulo: 'Lote 2 — Materiais de Alvenaria e Revestimento', status: 'em_cotacao', fase: 'execucao', created_at: new Date(), updated_at: new Date() });
records.cotacao_lotes.push({ id: l3Id, obra_id: obras[0].id, company_id: companyId, titulo: 'Lote 3 — Materiais Elétricos e Hidráulicos', status: 'aberto', fase: 'planejamento', created_at: new Date(), updated_at: new Date() });
records.cotacao_lotes.push({ id: l4Id, obra_id: obras[1].id, company_id: companyId, titulo: 'Lote 1 — Estrutura e Fundação', status: 'aberto', fase: 'planejamento', created_at: new Date(), updated_at: new Date() });

let itemLoteCounter = 1;
let respCounter = 1;
const writeLoteItem = (loteId, origemId, respostas = []) => {
  const loteItemId = `70000000-0000-0000-0000-${String(itemLoteCounter++).padStart(12, '0')}`;
  records.cotacao_lote_itens.push({ id: loteItemId, lote_id: loteId, item_origem_id: origemId, created_at: new Date() });
  respostas.forEach(r => {
    const respId = `70000001-0000-0000-0000-${String(respCounter++).padStart(12, '0')}`;
    records.cotacao_respostas.push({ id: respId, lote_id: loteId, item_origem_id: origemId, fornecedor_nome: r.fornecedor, preco_unitario: r.preco, prazo_entrega_dias: r.prazo || 5, observacoes: r.obs || '', is_vencedor: r.vencedor ? true : false, created_at: new Date() });
  });
};

writeLoteItem(l1Id, genId('1', 'd', 2, 1, 1), [ {fornecedor: fornecedores[0].nome, preco: 450, prazo: 3, vencedor: true}, {fornecedor: fornecedores[1].nome, preco: 485, prazo: 2, vencedor: false} ]);
writeLoteItem(l1Id, genId('1', 'd', 2, 1, 2), [ {fornecedor: fornecedores[0].nome, preco: 10.8, prazo: 5, vencedor: false}, {fornecedor: fornecedores[1].nome, preco: 9.9, prazo: 7, vencedor: true} ]);
writeLoteItem(l1Id, genId('1', 'd', 2, 2, 2), [ {fornecedor: fornecedores[0].nome, preco: 10.5, prazo: 5, vencedor: false}, {fornecedor: fornecedores[1].nome, preco: 9.7, prazo: 7, vencedor: true} ]);
writeLoteItem(l1Id, genId('1', 'd', 1, 2, 2), [ {fornecedor: fornecedores[0].nome, preco: 75, prazo: 3, vencedor: true}, {fornecedor: fornecedores[1].nome, preco: 82, prazo: 5, vencedor: false} ]);

writeLoteItem(l2Id, genId('1', 'd', 3, 1, 1), [ {fornecedor: fornecedores[0].nome, preco: 1.15, prazo: 2, vencedor: false} ]);
writeLoteItem(l2Id, genId('1', 'd', 5, 2, 2), [ {fornecedor: fornecedores[0].nome, preco: 26.5, prazo: 2, vencedor: false} ]);
writeLoteItem(l2Id, genId('1', 'd', 5, 2, 1), [ {fornecedor: fornecedores[0].nome, preco: 62.0, prazo: 5, vencedor: false} ]);
writeLoteItem(l2Id, genId('1', 'd', 5, 2, 3), [ {fornecedor: fornecedores[0].nome, preco: 14.5, prazo: 2, vencedor: false} ]);

writeLoteItem(l3Id, genId('1', 'd', 6, 1, 1));
writeLoteItem(l3Id, genId('1', 'd', 6, 1, 2));
writeLoteItem(l3Id, genId('1', 'd', 7, 1, 1));
writeLoteItem(l3Id, genId('1', 'd', 7, 2, 1));

writeLoteItem(l4Id, genId('2', 'd', 1, 1, 1));
writeLoteItem(l4Id, genId('2', 'd', 2, 1, 1));

const run = async () => {
  const checkErr = (res, context) => { if (res.error) throw new Error(`${context}: ${res.error.message}`); };

  console.log('Iniciando limpeza das 3 obras...');
  checkErr(await supabase.from('cotacao_respostas').delete().in('lote_id', records.cotacao_lotes.map(l => l.id)), 'delete respostas');
  checkErr(await supabase.from('cotacao_lote_itens').delete().in('lote_id', records.cotacao_lotes.map(l => l.id)), 'delete lote itens');
  checkErr(await supabase.from('cotacao_lotes').delete().in('obra_id', oIds), 'delete lotes');
  
  const subIds = records.orcamento_subitens.map(s => s.id);
  const compIds = records.orcamento_composicoes.map(c => c.id);
  const catIds = records.orcamento_categorias.map(c => c.id);
  const verIds = records.orcamento_versoes.map(v => v.id);
  
  console.log('Deletando orcamento_subitens...');
  for (let i = 0; i < subIds.length; i+=100) checkErr(await supabase.from('orcamento_subitens').delete().in('id', subIds.slice(i, i+100)), 'delete subitens');
  
  console.log('Deletando orcamento_composicoes...');
  for (let i = 0; i < compIds.length; i+=100) checkErr(await supabase.from('orcamento_composicoes').delete().in('id', compIds.slice(i, i+100)), 'delete composicoes');
  
  console.log('Deletando orcamento_categorias...');
  for (let i = 0; i < catIds.length; i+=100) checkErr(await supabase.from('orcamento_categorias').delete().in('id', catIds.slice(i, i+100)), 'delete categorias');
  
  console.log('Deletando orcamento_versoes...');
  checkErr(await supabase.from('orcamento_versoes').delete().in('id', verIds), 'delete versoes');
  
  console.log('Deletando contatos...');
  const contatosIds = records.contatos.map(c => c.id);
  checkErr(await supabase.from('contatos').delete().in('id', contatosIds), 'delete contatos');

  console.log('Inserindo contatos...');
  checkErr(await supabase.from('contatos').insert(records.contatos), 'insert contatos');
  
  console.log('Inserindo orcamento_versoes...');
  checkErr(await supabase.from('orcamento_versoes').insert(records.orcamento_versoes), 'insert versoes');
  
  console.log('Inserindo orcamento_categorias...');
  checkErr(await supabase.from('orcamento_categorias').insert(records.orcamento_categorias), 'insert categorias');
  
  console.log('Inserindo orcamento_composicoes...');
  for (let i = 0; i < records.orcamento_composicoes.length; i+=100) {
    checkErr(await supabase.from('orcamento_composicoes').insert(records.orcamento_composicoes.slice(i, i+100)), 'insert composicoes');
  }
  
  console.log('Inserindo orcamento_subitens...');
  for (let i = 0; i < records.orcamento_subitens.length; i+=100) {
    checkErr(await supabase.from('orcamento_subitens').insert(records.orcamento_subitens.slice(i, i+100)), 'insert subitens');
  }
  
  console.log('Inserindo cotacao_lotes...');
  checkErr(await supabase.from('cotacao_lotes').insert(records.cotacao_lotes), 'insert lotes');
  
  console.log('Inserindo cotacao_lote_itens...');
  checkErr(await supabase.from('cotacao_lote_itens').insert(records.cotacao_lote_itens), 'insert lote itens');
  
  console.log('Inserindo cotacao_respostas...');
  checkErr(await supabase.from('cotacao_respostas').insert(records.cotacao_respostas), 'insert respostas');

  console.log('TUDO PRONTO!');
};

run().catch(console.error);
