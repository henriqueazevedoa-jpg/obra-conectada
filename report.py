"""
Lastra Intelligence — Gerador de Relatório HTML
Relatório visual para avaliação manual da Fase 0.
Mostra imagens das pranchas ao lado dos dados extraídos.
"""

import os
import json
import base64
from pathlib import Path
from datetime import datetime
from PIL import Image
from io import BytesIO

from project_state import ProjectState


def imagem_para_data_uri(imagem: Image.Image, max_width: int = 600) -> str:
    """Converte imagem para data URI para embed no HTML."""
    w, h = imagem.size
    if w > max_width:
        ratio = max_width / w
        imagem = imagem.resize((max_width, int(h * ratio)))
    buf = BytesIO()
    imagem.save(buf, format="JPEG", quality=70)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def gerar_relatorio(state: ProjectState, resultado_final: dict,
                     imagens: list[Image.Image], output_dir: str):
    """Gera relatório HTML completo para avaliação da Fase 0."""

    html = _template_html(state, resultado_final, imagens)

    caminho = os.path.join(output_dir, "relatorio.html")
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n✅ Relatório gerado: {caminho}")
    return caminho


def _template_html(state: ProjectState, resultado: dict,
                    imagens: list[Image.Image]) -> str:

    state_dict = state.to_dict()
    meta = state_dict["metadados_projeto"]
    custos = state_dict["custos"]

    # ── Seção de pranchas ─────────────────────────────────────────────────────
    html_pranchas = ""
    for i, prancha in sorted(state.pranchas.items()):
        cor_tipo = {
            "tabela_areas":       "#22c55e",
            "tabela_esquadrias":  "#22c55e",
            "tabela_acabamentos": "#22c55e",
            "tabela_ou_detalhe":  "#86efac",
            "planta_baixa":       "#3b82f6",
            "corte_ou_elevacao":  "#8b5cf6",
            "carimbo":            "#f59e0b",
            "prancha_vazia":      "#d1d5db",
            "desconhecido":       "#9ca3af",
        }.get(prancha.tipo_provavel, "#9ca3af")

        duplicata_badge = ""
        if prancha.duplicata_de is not None:
            duplicata_badge = (
                f'<span style="background:#fef3c7;color:#92400e;'
                f'padding:2px 8px;border-radius:4px;font-size:11px;">'
                f'Duplicata da prancha {prancha.duplicata_de}</span>'
            )

        tabelas_html = ""
        if prancha.tabelas_geometricas:
            for tab in prancha.tabelas_geometricas:
                tabelas_html += f"""
                <div style="margin-top:8px;padding:8px;background:#f0fdf4;
                            border:1px solid #86efac;border-radius:4px;">
                  <strong style="color:#166534;font-size:12px;">
                    📊 {tab['tipo']} — extraído geometricamente 
                    ({tab['linhas']} linhas × {tab['colunas']} colunas)
                  </strong>
                  {_tabela_html(tab.get('cabecalho'), tab.get('conteudo', [])[:5])}
                </div>"""

        img_html = ""
        if i < len(imagens) and prancha.duplicata_de is None:
            try:
                data_uri = imagem_para_data_uri(imagens[i], max_width=500)
                img_html = f'<img src="{data_uri}" style="max-width:100%;border-radius:4px;margin-top:8px;">'
            except Exception:
                pass

        html_pranchas += f"""
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;
                    padding:16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="background:{cor_tipo};color:white;padding:2px 10px;
                         border-radius:12px;font-size:12px;font-weight:600;">
              {prancha.tipo_provavel}
            </span>
            <span style="color:#6b7280;font-size:13px;">
              Prancha {i} — confiança: {prancha.confianca_tipo:.0%} 
              — densidade: {prancha.densidade_visual:.3f}
              — {prancha.tipo_pdf}
            </span>
            {duplicata_badge}
          </div>
          {f'<div style="font-size:12px;color:#6b7280;">Escala: {prancha.escala_declarada}</div>' if prancha.escala_declarada else ''}
          {f'<div style="font-size:12px;color:#059669;">✅ Carimbo detectado</div>' if prancha.tem_carimbo else ''}
          {tabelas_html}
          {img_html}
        </div>"""

    # ── Seção de dados extraídos ──────────────────────────────────────────────
    dados_por_modulo = {}
    for dado in state.dados_extraidos:
        m = dado.modulo_destino
        if m not in dados_por_modulo:
            dados_por_modulo[m] = []
        dados_por_modulo[m].append(dado)

    html_dados = ""
    cores_modulo = {
        "orcamento": "#3b82f6",
        "contratos": "#8b5cf6",
        "cronograma": "#f59e0b",
        "documentos": "#6b7280",
    }

    for modulo, dados in dados_por_modulo.items():
        cor = cores_modulo.get(modulo, "#6b7280")
        html_dados += f"""
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;
                    padding:16px;margin-bottom:12px;">
          <h3 style="color:{cor};margin:0 0 12px;font-size:15px;text-transform:uppercase;">
            {modulo} — {len(dados)} itens extraídos
          </h3>"""

        for dado in dados:
            conf_cor = (
                "#22c55e" if dado.confianca >= 0.85 else
                "#f59e0b" if dado.confianca >= 0.70 else
                "#ef4444"
            )
            fonte_badge = (
                "🔧 pré-IA" if dado.fonte == "pre_ai" else
                "🤖 Gemini+Sonnet" if dado.fonte == "sonnet" else
                dado.fonte
            )
            html_dados += f"""
          <div style="border-left:3px solid {conf_cor};padding:8px 12px;
                      margin-bottom:8px;background:#f9fafb;border-radius:0 4px 4px 0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <strong style="font-size:13px;">{dado.tipo}</strong>
              <span style="font-size:11px;color:{conf_cor};">
                {dado.confianca:.0%} confiança · {fonte_badge} · {dado.prancha_origem}
              </span>
            </div>
            <pre style="font-size:11px;color:#374151;margin:0;overflow-x:auto;
                        white-space:pre-wrap;">{json.dumps(dado.valor, ensure_ascii=False, indent=2)[:500]}</pre>
          </div>"""

        html_dados += "</div>"

    # ── Resultado final da consolidação ──────────────────────────────────────
    html_resultado = ""
    if resultado:
        inconsistencias = resultado.get("inconsistencias", [])
        ausentes        = resultado.get("campos_ausentes", [])
        conf_geral      = resultado.get("confianca_geral", 0)

        html_resultado = f"""
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
          <div style="display:flex;gap:16px;margin-bottom:16px;">
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;
                        padding:12px;flex:1;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#166534;">
                {conf_geral:.0%}
              </div>
              <div style="font-size:12px;color:#6b7280;">Confiança Geral</div>
            </div>
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;
                        padding:12px;flex:1;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#92400e;">
                {len(inconsistencias)}
              </div>
              <div style="font-size:12px;color:#6b7280;">Inconsistências</div>
            </div>
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
                        padding:12px;flex:1;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#991b1b;">
                {len(ausentes)}
              </div>
              <div style="font-size:12px;color:#6b7280;">Campos Ausentes</div>
            </div>
          </div>

          {''.join(f'<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:8px;margin-bottom:6px;font-size:12px;"><strong>⚠️ {inc.get("campo")}</strong>: {inc.get("valor_a")} ({inc.get("fonte_a")}) vs {inc.get("valor_b")} ({inc.get("fonte_b")})</div>' for inc in inconsistencias)}

          {f'<div style="margin-top:12px;font-size:12px;color:#6b7280;"><strong>Campos ausentes:</strong> {", ".join(ausentes)}</div>' if ausentes else ''}

          <pre style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;
                      padding:12px;font-size:11px;overflow-x:auto;margin-top:12px;
                      max-height:400px;overflow-y:auto;">{json.dumps(resultado, ensure_ascii=False, indent=2)}</pre>
        </div>"""

    # ── Custo ─────────────────────────────────────────────────────────────────
    html_custo = f"""
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
          <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;
                        padding:12px;min-width:140px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#0369a1;">
                ${custos['total_usd']:.4f}
              </div>
              <div style="font-size:12px;color:#6b7280;">Custo USD</div>
            </div>
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;
                        padding:12px;min-width:140px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#0369a1;">
                R$ {custos['total_brl']:.2f}
              </div>
              <div style="font-size:12px;color:#6b7280;">Custo BRL</div>
            </div>
            <div style="background:#fdf4ff;border:1px solid #e879f9;border-radius:8px;
                        padding:12px;min-width:140px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#7e22ce;">
                {custos['creditos_lastra']:.0f}
              </div>
              <div style="font-size:12px;color:#6b7280;">Créditos Lastra</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="background:#f9fafb;">
              <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e5e7eb;">Operação</th>
              <th style="padding:6px 8px;text-align:right;border-bottom:1px solid #e5e7eb;">Provedor</th>
              <th style="padding:6px 8px;text-align:right;border-bottom:1px solid #e5e7eb;">USD</th>
              <th style="padding:6px 8px;text-align:right;border-bottom:1px solid #e5e7eb;">Créditos</th>
            </tr>
            {''.join(f"<tr><td style='padding:4px 8px;border-bottom:1px solid #f3f4f6;color:#374151;'>{op['operacao']}</td><td style='padding:4px 8px;text-align:right;color:#6b7280;'>{op['provedor']}</td><td style='padding:4px 8px;text-align:right;'>${op['usd']:.4f}</td><td style='padding:4px 8px;text-align:right;color:#7e22ce;'>{op['creditos']:.1f}</td></tr>" for op in custos['por_operacao'])}
          </table>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lastra Intelligence — Relatório de Análise</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f3f4f6; color: #111827; }}
    .container {{ max-width: 1100px; margin: 0 auto; padding: 24px; }}
    h1 {{ font-size: 24px; font-weight: 700; color: #1e1b4b; }}
    h2 {{ font-size: 16px; font-weight: 600; color: #374151; margin: 24px 0 12px; 
          padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }}
    pre {{ font-family: 'Fira Code', 'Courier New', monospace; }}
  </style>
</head>
<body>
  <div class="container">

    <div style="background:linear-gradient(135deg, #3d3a8c, #6c63ff);
                border-radius:12px;padding:24px;margin-bottom:24px;color:white;">
      <div style="font-size:11px;opacity:0.7;margin-bottom:4px;text-transform:uppercase;
                  letter-spacing:1px;">Lastra Intelligence — Fase 0</div>
      <h1 style="color:white;margin-bottom:4px;">
        {meta.get('nome', 'Projeto Sem Nome') or 'Projeto Sem Nome'}
      </h1>
      <div style="opacity:0.8;font-size:14px;">
        {meta.get('responsavel') or '—'} · 
        {meta.get('cau_crea') or '—'} · 
        {meta.get('data') or '—'} · 
        Escala {meta.get('escala_padrao') or '?'}
      </div>
      <div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;">
        <div><strong>{len(state.pranchas)}</strong> <span style="opacity:0.7;">pranchas</span></div>
        <div><strong>{len(state.ambientes)}</strong> <span style="opacity:0.7;">ambientes</span></div>
        <div><strong>{len(state.esquadrias)}</strong> <span style="opacity:0.7;">esquadrias</span></div>
        <div><strong>{len(state.dados_extraidos)}</strong> <span style="opacity:0.7;">dados extraídos</span></div>
        <div><strong>{len(state.erros)}</strong> <span style="opacity:0.7;">erros</span></div>
      </div>
    </div>

    <h2>💰 Custo da Análise</h2>
    {html_custo}

    <h2>✅ Resultado Consolidado</h2>
    {html_resultado if html_resultado else '<p style="color:#6b7280;padding:16px;">Nenhum resultado de consolidação disponível.</p>'}

    <h2>📦 Dados Extraídos por Módulo</h2>
    {html_dados if html_dados else '<p style="color:#6b7280;padding:16px;">Nenhum dado extraído ainda.</p>'}

    <h2>🗂️ Pranchas ({len(state.pranchas)} total)</h2>
    {html_pranchas}

    <div style="text-align:center;padding:24px;color:#9ca3af;font-size:12px;">
      Lastra Intelligence · Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}
    </div>

  </div>
</body>
</html>"""


def _tabela_html(cabecalho: list, linhas: list) -> str:
    """Renderiza tabela HTML compacta."""
    if not cabecalho and not linhas:
        return ""

    html = '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:6px;">'

    if cabecalho:
        html += "<tr>"
        for cell in (cabecalho or []):
            html += (f'<th style="padding:3px 6px;background:#dcfce7;'
                     f'border:1px solid #86efac;text-align:left;">'
                     f'{cell or ""}</th>')
        html += "</tr>"

    for linha in (linhas or []):
        html += "<tr>"
        for cell in (linha or []):
            html += (f'<td style="padding:3px 6px;border:1px solid #e5e7eb;">'
                     f'{cell or ""}</td>')
        html += "</tr>"

    html += "</table>"
    return html
