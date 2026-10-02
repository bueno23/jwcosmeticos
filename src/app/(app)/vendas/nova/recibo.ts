import { money } from '@/lib/format'
import { ROTULO_PAGAMENTO } from '../venda'
import type { ReciboVenda } from '@/lib/services/vendas'

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Abre uma janela só com o recibo e imprime: a página do PDV tem menu e painéis que não devem sair no papel. */
export function imprimirRecibo(v: ReciboVenda, empresa: string) {
  const janela = window.open('', '_blank', 'width=360,height=640')
  if (!janela) return false

  const quando = v.criadaEm.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const linhas = v.itens
    .map((i) => `<tr><td>${i.quantidade}x ${esc(i.nome)}</td><td class="d">${esc(money(i.total))}</td></tr>`)
    .join('')
  const extra = [
    v.desconto > 0 ? `<tr><td>Desconto</td><td class="d">- ${esc(money(v.desconto))}</td></tr>` : '',
    v.recebido != null ? `<tr><td>Recebido</td><td class="d">${esc(money(v.recebido))}</td></tr><tr><td>Troco</td><td class="d">${esc(money(v.troco))}</td></tr>` : '',
  ].join('')

  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Venda #${v.numero}</title>
<style>body{font:12px/1.4 monospace;width:280px;margin:8px auto;color:#000}h1{font-size:14px;text-align:center;margin:0}
p{margin:2px 0;text-align:center}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:1px 0;vertical-align:top}
.d{text-align:right;white-space:nowrap}.t td{border-top:1px dashed #000;font-weight:bold;font-size:14px;padding-top:4px}</style></head>
<body><h1>${esc(empresa)}</h1><p>Venda #${v.numero}</p><p>${esc(quando)}</p>
<table>${linhas}<tr class="t"><td>TOTAL</td><td class="d">${esc(money(v.total))}</td></tr>${extra}</table>
<p style="margin-top:8px">${esc(ROTULO_PAGAMENTO[v.pagamento])}${v.cliente ? ` — ${esc(v.cliente)}` : ''}</p>
<p>Atendente: ${esc(v.vendedor)}</p><p>Obrigado pela preferência!</p></body></html>`)
  janela.document.close()
  janela.focus()
  janela.print()
  return true
}
