import { readFileSync, writeFileSync } from 'fs';

function parseMcpOutput(path, marker) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const text = data.result;
  const jsonStr = text.split(`<untrusted-data-${marker}>\n`)[1].split(`\n</untrusted-data-${marker}>`)[0];
  return JSON.parse(jsonStr);
}

const base = 'C:/Users/henri/.gemini/antigravity/brain/2ee74346-0796-4280-b444-50969a57f421/.system_generated';

// 61: todas tabelas
const t1 = parseMcpOutput(base + '/steps/61/output.txt', 'd93d6ddd-6e43-450e-b1e1-07c206d178b5');
const s1 = t1.map(r => `${r.table_name}\t${r.num_colunas} colunas`).join('\n');
writeFileSync('src/_auditoria/schema/todas_tabelas.txt', s1);

// 62: foreign keys
const t2 = parseMcpOutput(base + '/steps/62/output.txt', 'a50983ec-a2df-4d66-a5bd-a406874869b2');
const s2 = t2.map(r => `${r.tabela_origem}.${r.coluna} -> ${r.tabela_destino} (${r.constraint_name})`).join('\n');
writeFileSync('src/_auditoria/schema/foreign_keys.txt', s2);

// 63: rls
const t3 = parseMcpOutput(base + '/steps/63/output.txt', '2bd0d92d-b465-4afc-918d-210407c7500a');
const s3 = t3.map(r => `${r.schemaname}.${r.tablename}\tRLS: ${r.rowsecurity}`).join('\n');
writeFileSync('src/_auditoria/schema/rls_status.txt', s3);

// funcoes_rpc
const t4 = JSON.parse(`[{"routine_name":"_cleanup_demo_data_for_company","routine_type":"FUNCTION"},{"routine_name":"auto_create_membership","routine_type":"FUNCTION"},{"routine_name":"auto_create_obra_membership","routine_type":"FUNCTION"},{"routine_name":"bootstrap_demo_obras","routine_type":"FUNCTION"},{"routine_name":"buscar_precos_historicos","routine_type":"FUNCTION"},{"routine_name":"can_modify_obra","routine_type":"FUNCTION"},{"routine_name":"check_plan_limit","routine_type":"FUNCTION"},{"routine_name":"complete_onboarding","routine_type":"FUNCTION"},{"routine_name":"expandir_composicao_sinapi","routine_type":"FUNCTION"},{"routine_name":"get_my_role_and_company","routine_type":"FUNCTION"},{"routine_name":"get_obra_from_aditivo","routine_type":"FUNCTION"},{"routine_name":"get_obra_from_fornecedor","routine_type":"FUNCTION"},{"routine_name":"get_obra_from_medicao_contrato","routine_type":"FUNCTION"},{"routine_name":"get_sinapi_grupos","routine_type":"FUNCTION"},{"routine_name":"get_user_company_id","routine_type":"FUNCTION"},{"routine_name":"get_user_role","routine_type":"FUNCTION"},{"routine_name":"handle_new_user","routine_type":"FUNCTION"},{"routine_name":"handle_obra_creation","routine_type":"FUNCTION"},{"routine_name":"insert_feedback_anonimo","routine_type":"FUNCTION"},{"routine_name":"is_obra_gestor","routine_type":"FUNCTION"},{"routine_name":"is_obra_member","routine_type":"FUNCTION"},{"routine_name":"is_platform_admin","routine_type":"FUNCTION"},{"routine_name":"match_sinapi_item","routine_type":"FUNCTION"},{"routine_name":"remove_demo_data","routine_type":"FUNCTION"},{"routine_name":"search_sinapi","routine_type":"FUNCTION"},{"routine_name":"set_updated_at","routine_type":"FUNCTION"},{"routine_name":"update_company_user_role","routine_type":"FUNCTION"},{"routine_name":"update_company_user_role","routine_type":"FUNCTION"},{"routine_name":"update_contatos_updated_at","routine_type":"FUNCTION"},{"routine_name":"update_entradas_pendentes_updated_at","routine_type":"FUNCTION"},{"routine_name":"update_obra_links_updated_at","routine_type":"FUNCTION"},{"routine_name":"update_tarefa_dias_impedidos","routine_type":"FUNCTION"},{"routine_name":"update_updated_at_column","routine_type":"FUNCTION"}]`);
const s4 = t4.map(r => `${r.routine_name}\t${r.routine_type}`).join('\n');
writeFileSync('src/_auditoria/schema/funcoes_rpc.txt', s4);

// contagem_dados
const t5 = JSON.parse(`[{"tabela":"obras","count":17},{"tabela":"orcamento_versoes","count":14},{"tabela":"orcamento_categorias","count":59},{"tabela":"orcamento_composicoes","count":102},{"tabela":"orcamento_subitens","count":29},{"tabela":"cronograma_tarefas","count":2},{"tabela":"pagamentos","count":50},{"tabela":"contratos","count":0},{"tabela":"diario_registros","count":43},{"tabela":"feedbacks","count":0},{"tabela":"companies","count":5},{"tabela":"profiles","count":6}]`);
const s5 = t5.map(r => `${r.tabela}\t${r.count}`).join('\n');
writeFileSync('src/_auditoria/schema/contagem_dados.txt', s5);

console.log('Schema files created successfully.');
