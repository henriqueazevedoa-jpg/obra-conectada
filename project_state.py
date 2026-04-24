"""
Lastra Intelligence — Estado do Projeto
Objeto acumulador que cresce durante o processamento.
Cada etapa lê o estado atual e escreve seus resultados.
"""

from dataclasses import dataclass, field
from typing import Optional, Any
import json
from datetime import datetime


@dataclass
class CustoAPI:
    provedor: str
    modelo: str
    tokens_input: int
    tokens_output: int
    operacao: str

    @property
    def custo_usd(self) -> float:
        from config import (
            CUSTO_CLAUDE_INPUT, CUSTO_CLAUDE_OUTPUT,
            CUSTO_GEMINI_INPUT, CUSTO_GEMINI_OUTPUT
        )
        if self.provedor == "anthropic":
            return (
                self.tokens_input  / 1_000_000 * CUSTO_CLAUDE_INPUT +
                self.tokens_output / 1_000_000 * CUSTO_CLAUDE_OUTPUT
            )
        elif self.provedor == "google":
            return (
                self.tokens_input  / 1_000_000 * CUSTO_GEMINI_INPUT +
                self.tokens_output / 1_000_000 * CUSTO_GEMINI_OUTPUT
            )
        return 0.0

    @property
    def creditos_lastra(self) -> float:
        from config import MARGEM_CREDITOS, USD_BRL, CREDITOS_POR_REAL
        return self.custo_usd * MARGEM_CREDITOS * USD_BRL * CREDITOS_POR_REAL


@dataclass
class DadoExtraido:
    """Unidade atômica de dado extraído — vai para project_intelligence no futuro."""
    modulo_destino: str        # 'orcamento' | 'contratos' | 'cronograma' | 'documentos'
    tipo_dado: str             # 'esquadrias' | 'areas' | 'carimbo' | 'art' | ...
    valor: Any                 # estrutura específica por tipo
    confianca: float           # 0.0 a 1.0
    prancha_origem: str        # identificação da prancha
    fonte: str                 # 'pre_ai' | 'gemini' | 'sonnet' | 'inferido'
    inferido: bool = False


@dataclass
class InfoPrancha:
    """Resultado do pré-processamento de uma prancha."""
    numero: int
    hash_p: Optional[str]        = None
    hash_d: Optional[str]        = None
    duplicata_de: Optional[int]  = None
    densidade_visual: float      = 0.0
    tipo_provavel: str           = "desconhecido"
    confianca_tipo: float        = 0.0
    tem_carimbo: bool            = False
    bbox_carimbo: Optional[tuple]= None
    escala_declarada: Optional[str] = None
    escala_calculada: Optional[str] = None
    num_portas_detectadas: int   = 0
    num_janelas_detectadas: int  = 0
    tem_tabela_geometrica: bool  = False
    tabelas_geometricas: list    = field(default_factory=list)
    layers_cad: list             = field(default_factory=list)
    tipo_pdf: str                = "desconhecido"   # 'vetorial' | 'escaneado'
    prioridade: int              = 5                # 1=alta, 10=baixa
    bboxes_pre_ai: list          = field(default_factory=list)
    texto_extraido: str          = ""
    ratio_ortogonal: float       = 0.0
    descricao_usuario: Optional[str] = None
    tipo_usuario: Optional[str]      = None


class ProjectState:
    """
    Estado acumulado do projeto durante o processamento.
    Cresce a cada etapa. Serializado como contexto para os prompts de IA.
    """

    def __init__(self, caminho_pdf: str, descricao_usuario: str = ""):
        self.caminho_pdf        = caminho_pdf
        self.descricao_usuario  = descricao_usuario
        self.iniciado_em        = datetime.now().isoformat()

        # ── Metadados do projeto (preenchidos durante processamento) ──────────
        self.nome_projeto:       Optional[str] = None
        self.responsavel_tecnico:Optional[str] = None
        self.cau_crea:           Optional[str] = None
        self.data_projeto:       Optional[str] = None
        self.revisao:            Optional[str] = None
        self.escala_padrao:      Optional[str] = None
        self.software_origem:    Optional[str] = None   # AutoCAD, Revit, etc.
        self.tipologia:          Optional[str] = None   # 'residencial_unifamiliar', etc.
        self.num_pavimentos:     Optional[int] = None
        self.area_total_m2:      Optional[float] = None

        # ── Informações por prancha ───────────────────────────────────────────
        self.pranchas: dict[int, InfoPrancha] = {}

        # ── Dados extraídos acumulados ────────────────────────────────────────
        self.dados_extraidos: list[DadoExtraido] = []

        # ── Ambientes identificados (alimentam interpretação de plantas) ──────
        self.ambientes: list[dict] = []   # {nome, area_m2, pavimento}

        # ── Esquadrias identificadas ──────────────────────────────────────────
        self.esquadrias: list[dict] = []

        # ── Acabamentos identificados ─────────────────────────────────────────
        self.acabamentos: list[dict] = []

        # ── Controle de processamento ─────────────────────────────────────────
        self.pranchas_processadas_fase1: list[int] = []
        self.pranchas_processadas_fase2: list[int] = []
        self.erros: list[dict] = []

        # ── Rastreamento de custo ─────────────────────────────────────────────
        self.custos: list[CustoAPI] = []

    # ── Registro de custo ─────────────────────────────────────────────────────

    def registrar_custo(self, provedor: str, modelo: str,
                        tokens_input: int, tokens_output: int,
                        operacao: str):
        self.custos.append(CustoAPI(
            provedor=provedor,
            modelo=modelo,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            operacao=operacao
        ))

    @property
    def custo_total_usd(self) -> float:
        return sum(c.custo_usd for c in self.custos)

    @property
    def creditos_total(self) -> float:
        return sum(c.creditos_lastra for c in self.custos)

    # ── Registro de dado extraído ─────────────────────────────────────────────

    def adicionar_dado(self, modulo: str, tipo: str, valor: Any,
                       confianca: float, prancha: str, fonte: str,
                       inferido: bool = False):
        self.dados_extraidos.append(DadoExtraido(
            modulo_destino=modulo,
            tipo_dado=tipo,
            valor=valor,
            confianca=confianca,
            prancha_origem=prancha,
            fonte=fonte,
            inferido=inferido
        ))

    # ── Serialização para contexto de prompt ──────────────────────────────────

    def resumo_para_gemini(self, prancha_atual: int) -> str:
        """Contexto compacto enviado no prompt do Gemini."""
        linhas = ["CONTEXTO DO PROJETO:"]

        if self.nome_projeto:
            linhas.append(f"  Nome: {self.nome_projeto}")
        if self.responsavel_tecnico:
            linhas.append(f"  Responsável: {self.responsavel_tecnico}")
        if self.escala_padrao:
            linhas.append(f"  Escala padrão declarada: {self.escala_padrao}")
        if self.tipologia:
            linhas.append(f"  Tipologia: {self.tipologia}")
        if self.num_pavimentos:
            linhas.append(f"  Pavimentos: {self.num_pavimentos}")

        processadas = len(self.pranchas_processadas_fase1) + \
                      len(self.pranchas_processadas_fase2)
        total = len(self.pranchas)
        linhas.append(f"  Pranchas processadas: {processadas} de {total}")

        tipos_ja_vistos = list({
            p.tipo_provavel for p in self.pranchas.values()
            if p.tipo_provavel != "desconhecido"
        })
        if tipos_ja_vistos:
            linhas.append(f"  Tipos já identificados: {', '.join(tipos_ja_vistos)}")

        prancha_info = self.pranchas.get(prancha_atual)
        if prancha_info:
            if prancha_info.tipo_usuario:
                linhas.append(
                    f"\nO usuário descreveu esta prancha como: "
                    f"'{prancha_info.tipo_usuario}'. "
                    f"Confirme ou corrija se divergir do conteúdo real."
                )
            if prancha_info.descricao_usuario:
                linhas.append(
                    f"Detalhe adicional do usuário: '{prancha_info.descricao_usuario}'"
                )

        return "\n".join(linhas)

    def resumo_para_sonnet(self, tipo_fragmento: str) -> str:
        """Contexto rico enviado no prompt do Sonnet."""
        linhas = ["CONTEXTO COMPLETO DO PROJETO:"]

        campos = [
            ("Nome", self.nome_projeto),
            ("Responsável", self.responsavel_tecnico),
            ("CAU/CREA", self.cau_crea),
            ("Data", self.data_projeto),
            ("Revisão", self.revisao),
            ("Escala padrão", self.escala_padrao),
            ("Software", self.software_origem),
            ("Tipologia", self.tipologia),
            ("Pavimentos", self.num_pavimentos),
            ("Área total", f"{self.area_total_m2}m²" if self.area_total_m2 else None),
        ]

        for label, valor in campos:
            if valor:
                linhas.append(f"  {label}: {valor}")

        if self.ambientes:
            linhas.append(f"\nAMBIENTES JÁ IDENTIFICADOS ({len(self.ambientes)}):")
            for amb in self.ambientes[:15]:  # limita para não explodir o contexto
                linhas.append(
                    f"  {amb.get('nome', '?')} — "
                    f"{amb.get('area_m2', '?')}m² "
                    f"({amb.get('pavimento', '?')})"
                )

        if self.esquadrias and tipo_fragmento in ("planta_baixa", "detalhe"):
            linhas.append(f"\nESQUADRIAS JÁ IDENTIFICADAS: {len(self.esquadrias)} itens")

        return "\n".join(linhas)

    # ── Serialização completa ─────────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "caminho_pdf":        self.caminho_pdf,
            "iniciado_em":        self.iniciado_em,
            "metadados_projeto": {
                "nome":            self.nome_projeto,
                "responsavel":     self.responsavel_tecnico,
                "cau_crea":        self.cau_crea,
                "data":            self.data_projeto,
                "revisao":         self.revisao,
                "escala_padrao":   self.escala_padrao,
                "software":        self.software_origem,
                "tipologia":       self.tipologia,
                "num_pavimentos":  self.num_pavimentos,
                "area_total_m2":   self.area_total_m2,
            },
            "pranchas": {
                str(k): {
                    "numero":           v.numero,
                    "tipo_provavel":    v.tipo_provavel,
                    "confianca_tipo":   v.confianca_tipo,
                    "duplicata_de":     v.duplicata_de,
                    "densidade_visual": round(v.densidade_visual, 4),
                    "tem_carimbo":      v.tem_carimbo,
                    "escala_declarada": v.escala_declarada,
                    "escala_calculada": v.escala_calculada,
                    "tem_tabela":       v.tem_tabela_geometrica,
                    "layers_cad":       v.layers_cad,
                    "tipo_pdf":         v.tipo_pdf,
                    "prioridade":       v.prioridade,
                }
                for k, v in self.pranchas.items()
            },
            "dados_extraidos": [
                {
                    "modulo":    d.modulo_destino,
                    "tipo":      d.tipo_dado,
                    "valor":     d.valor,
                    "confianca": round(d.confianca, 3),
                    "prancha":   d.prancha_origem,
                    "fonte":     d.fonte,
                    "inferido":  d.inferido,
                }
                for d in self.dados_extraidos
            ],
            "resumo": {
                "total_pranchas":        len(self.pranchas),
                "pranchas_processadas":  len(self.pranchas_processadas_fase1) +
                                         len(self.pranchas_processadas_fase2),
                "dados_extraidos":       len(self.dados_extraidos),
                "erros":                 len(self.erros),
            },
            "custos": {
                "total_usd":       round(self.custo_total_usd, 4),
                "total_brl":       round(self.custo_total_usd * 5.70, 2),
                "creditos_lastra": round(self.creditos_total, 1),
                "por_operacao": [
                    {
                        "operacao":  c.operacao,
                        "provedor":  c.provedor,
                        "modelo":    c.modelo,
                        "usd":       round(c.custo_usd, 4),
                        "creditos":  round(c.creditos_lastra, 1),
                    }
                    for c in self.custos
                ],
            },
            "erros": self.erros,
        }

    def salvar_json(self, caminho: str):
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
