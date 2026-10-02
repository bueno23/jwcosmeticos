import { diaBR } from '@/app/(app)/financeiro/_lancamentos/datas'
import type { Carregado } from './dados'

type Celula = string | number | null

const fmt = (n: number) => n.toFixed(2).replace('.', ',')
const pct = (n: number) => n.toFixed(2).replace('.', ',')
const dia = (d: string | null) => (d ? diaBR(d) : '')

/** Texto que o Excel leria como fórmula ganha apóstrofo na frente. */
function texto(v: string): string {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

const NUMERO_BR = /^-?\d+,\d+$/

// Número já formatado com vírgula (inclusive negativo) não é fórmula: fica sem apóstrofo
const celula = (c: Celula) =>
  c === null ? '' : typeof c === 'number' ? String(c).replace('.', ',') : NUMERO_BR.test(c) ? c : texto(c)

function linhasDe(r: Carregado, visao: 'produto' | 'categoria'): { cabecalho: string[]; linhas: Celula[][] } {
  switch (r.aba) {
    case 'vendas':
      return {
        cabecalho: ['Data', 'Vendas', 'Faturamento', 'Ticket médio', 'Custo', 'Lucro bruto'],
        linhas: r.dados.dias.map((d) => [
          dia(d.dia), d.vendas, fmt(d.total), fmt(d.vendas ? d.total / d.vendas : 0), fmt(d.custo), fmt(d.total - d.custo),
        ]),
      }
    case 'mais-vendidos':
      return {
        cabecalho: ['Posição', 'Produto', 'Categoria', 'Quantidade', 'Faturamento', 'Custo', 'Lucro', 'Margem %'],
        linhas: r.dados.linhas.map((l, i) => [i + 1, l.nome, l.categoria, l.quantidade, fmt(l.receita), fmt(l.custo), fmt(l.lucro), pct(l.margem)]),
      }
    case 'parados':
      return {
        cabecalho: ['Produto', 'Categoria', 'Estoque', 'Custo unitário', 'Valor parado (custo)', 'Última venda'],
        linhas: r.dados.linhas.map((l) => [l.nome, l.categoria, l.estoque, fmt(l.custo), fmt(l.valorParado), dia(l.ultimaVenda)]),
      }
    case 'estoque':
      return {
        cabecalho: ['Produto', 'Categoria', 'Saldo', 'Mínimo', 'Custo unitário', 'Preço de venda', 'Valor de custo', 'Valor de venda'],
        linhas: r.dados.linhas.map((l) => [l.nome, l.categoria, l.estoque, l.minimo, fmt(l.custo), fmt(l.preco), fmt(l.valorCusto), fmt(l.valorVenda)]),
      }
    case 'estoque-baixo':
      return {
        cabecalho: ['Produto', 'Categoria', 'Saldo', 'Mínimo', 'Falta repor', 'Custo unitário', 'Custo da reposição'],
        linhas: r.dados.linhas.map((l) => [l.nome, l.categoria, l.estoque, l.minimo, l.falta, fmt(l.custo), fmt(l.custoReposicao)]),
      }
    case 'lucro':
      return {
        cabecalho: [visao === 'categoria' ? 'Categoria' : 'Produto', ...(visao === 'produto' ? ['Categoria'] : []), 'Quantidade', 'Receita', 'Custo', 'Lucro', 'Margem %'],
        linhas: r.dados.linhas.map((l) => [
          l.nome, ...(visao === 'produto' ? [l.categoria] : []), l.quantidade, fmt(l.receita), fmt(l.custo), fmt(l.lucro), pct(l.margem),
        ]),
      }
    case 'despesas':
      return {
        cabecalho: ['Categoria', 'Lançamentos', 'Total', '% do total'],
        linhas: r.dados.linhas.map((l) => [l.categoria, l.lancamentos, fmt(l.total), pct(l.percentual)]),
      }
    case 'fluxo':
      return {
        cabecalho: ['Data', 'Vendas recebidas', 'Receitas avulsas', 'Total de entradas', 'Despesas', 'Contas pagas', 'Total de saídas', 'Saldo do dia', 'Saldo acumulado'],
        linhas: r.dados.dias.map((d) => [
          dia(d.dia), fmt(d.vendas), fmt(d.receitas), fmt(d.entradas), fmt(d.despesas), fmt(d.contas), fmt(d.saidas), fmt(d.saldo), fmt(d.acumulado),
        ]),
      }
    case 'pagamentos':
      return {
        cabecalho: ['Forma de pagamento', 'Vendas', 'Total', '% do total'],
        linhas: r.dados.linhas.map((l) => [l.rotulo, l.vendas, fmt(l.total), pct(l.percentual)]),
      }
  }
}

/** Separador `;`, vírgula decimal e BOM: é o que o Excel pt-BR abre sem pedir importação. */
export function paraCsv(r: Carregado, visao: 'produto' | 'categoria'): string {
  const { cabecalho, linhas } = linhasDe(r, visao)
  const corpo = [cabecalho, ...linhas].map((l) => l.map((c) => celula(c)).join(';'))
  return '﻿' + corpo.join('\r\n') + '\r\n'
}
