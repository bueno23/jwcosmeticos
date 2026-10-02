import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, MovementType, PaymentMethod, CashMovementType } from '../src/generated/prisma'
import type { Product, Supplier, Customer } from '../src/generated/prisma'
import { gerarHashSenha } from '../src/lib/auth/senha'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const CATEGORIAS = [
  { name: 'Maquiagem', color: '#F5C518' },
  { name: 'Skincare', color: '#38BDF8' },
  { name: 'Cabelos', color: '#A78BFA' },
  { name: 'Perfumaria', color: '#EF4444' },
  { name: 'Corpo e Banho', color: '#22C55E' },
  { name: 'Unhas', color: '#F59E3B' },
  { name: 'Acessórios', color: '#C97B2A' },
  { name: 'Outros', color: '#9CA3AF' },
]

const PRODUTOS: [string, string, number, number, number, number, string | null][] = [
  // nome, categoria, custo, venda, estoque, mínimo, marca
  ['Batom Matte Vermelho', 'Maquiagem', 12.5, 29.9, 8, 10, 'Vivai'],
  ['Máscara de Cílios Volume', 'Maquiagem', 18.0, 39.9, 5, 6, 'Maybelline'],
  ['Base Líquida Bege 30ml', 'Maquiagem', 22.0, 49.9, 30, 6, 'Ruby Rose'],
  ['Paleta de Sombras Nude', 'Maquiagem', 28.0, 64.9, 12, 4, 'Ruby Rose'],
  ['Pó Compacto Translúcido', 'Maquiagem', 14.0, 32.9, 22, 8, 'Vult'],
  ['Sérum Facial Vitamina C 30ml', 'Skincare', 42.0, 89.9, 4, 5, 'Principia'],
  ['Protetor Solar FPS 60', 'Skincare', 35.0, 69.9, 20, 8, 'Isdin'],
  ['Hidratante Facial Ácido Hialurônico', 'Skincare', 31.0, 64.9, 16, 6, 'Neutrogena'],
  ['Água Micelar 200ml', 'Skincare', 16.0, 34.9, 26, 10, 'Garnier'],
  ['Shampoo Reparador 300ml', 'Cabelos', 14.5, 31.9, 34, 12, 'Elseve'],
  ['Máscara Capilar Hidratação 250g', 'Cabelos', 21.0, 45.9, 18, 6, 'Salon Line'],
  ['Óleo Capilar Reparador 60ml', 'Cabelos', 17.0, 38.9, 3, 6, 'Lola'],
  ['Perfume Floral Feminino 100ml', 'Perfumaria', 79.0, 149.9, 7, 4, 'O Boticário'],
  ['Body Splash Baunilha 200ml', 'Perfumaria', 24.0, 49.9, 28, 8, 'Natura'],
  ['Hidratante Corporal 400ml', 'Corpo e Banho', 19.0, 38.9, 16, 6, 'Nivea'],
  ['Sabonete Líquido Íntimo 200ml', 'Corpo e Banho', 11.0, 24.9, 40, 12, 'Dermacyd'],
  ['Esmalte Vermelho Cereja', 'Unhas', 3.2, 7.9, 60, 20, 'Risqué'],
  ['Kit Lixas e Alicate de Unhas', 'Unhas', 9.0, 19.9, 14, 6, null],
  ['Pincel de Maquiagem Kit 12 peças', 'Acessórios', 26.0, 59.9, 10, 4, 'Macrilan'],
  ['Presilha de Cabelo Sortida', 'Acessórios', 2.0, 6.0, 80, 30, null],
]

const FORNECEDORES = [
  { legalName: 'Distribuidora Beleza Central LTDA', tradeName: 'Central Beleza', document: '12.345.678/0001-90', phone: '(11) 3344-5566', contactName: 'Marcelo' },
  { legalName: 'Atacadão de Cosméticos ME', tradeName: 'Atacadão Cosméticos', document: '98.765.432/0001-10', phone: '(11) 2233-4455', contactName: 'Patrícia' },
  { legalName: 'Perfumes & Cia Importadora S.A.', tradeName: 'Perfumes & Cia', document: '45.678.912/0001-33', phone: '(11) 4455-6677', contactName: 'Renato' },
]

const CLIENTES = [
  { name: 'Ana Paula', phone: '(11) 98888-7777', notes: 'Compra maquiagem todo mês' },
  { name: 'Marcela', phone: '(11) 97777-6666', notes: null },
  { name: 'Dona Lúcia', phone: '(11) 96666-5555', notes: 'Prefere perfumes florais' },
  { name: 'Rafaela do salão', phone: '(11) 95555-4444', notes: 'Revende produtos de cabelo' },
  { name: 'Carla', phone: null, notes: 'Cliente de skincare' },
]

const DESPESAS = [
  ['Aluguel do ponto', 'Aluguel', 1500, 2],
  ['Conta de energia', 'Energia', 486.3, 5],
  ['Internet fibra', 'Internet', 129.9, 5],
  ['Salário — Stephanie', 'Funcionários', 1620, 4],
  ['Compra de mercadoria — Central Beleza', 'Fornecedores', 3280.4, 8],
  ['Simples Nacional', 'Impostos', 740.2, 12],
  ['Impulsionar post no Instagram', 'Marketing', 120, 14],
  ['Manutenção do ar-condicionado', 'Outros', 360, 19],
] as const

const rand = (min: number, max: number) => Math.random() * (max - min) + min
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
const pick = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)]!

async function main() {
  console.log('Limpando dados anteriores…')
  await prisma.company.deleteMany()

  const company = await prisma.company.create({
    data: {
      name: 'JW Cosméticos Multimarcas',
      tagline: 'Beleza, variedade e as melhores marcas',
      document: '11.222.333/0001-44',
      phone: '(11) 99999-0000',
      address: 'Rua das Palmeiras, 128 — São Paulo/SP',
    },
  })

  const dono = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Administrador',
      email: 'jw@exemplo.com',
      passwordHash: await gerarHashSenha('jw123'),
      role: 'DONO',
    },
  })
  const gerente = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Marcos',
      email: 'marcos@exemplo.com',
      passwordHash: await gerarHashSenha('jw123'),
      role: 'GERENTE',
    },
  })
  const operadora = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Stephanie',
      email: 'stephanie@exemplo.com',
      passwordHash: await gerarHashSenha('jw123'),
      role: 'OPERADOR',
    },
  })

  const categorias = new Map<string, string>()
  for (const c of CATEGORIAS) {
    const cat = await prisma.category.create({ data: { companyId: company.id, ...c } })
    categorias.set(c.name, cat.id)
  }

  const fornecedores: Supplier[] = []
  for (const f of FORNECEDORES) {
    fornecedores.push(await prisma.supplier.create({ data: { companyId: company.id, ...f } }))
  }

  const catsFinanceiras = new Map<string, string>()
  for (const nome of ['Aluguel', 'Energia', 'Internet', 'Funcionários', 'Fornecedores', 'Impostos', 'Marketing', 'Outros']) {
    const c = await prisma.financeCategory.create({ data: { companyId: company.id, name: nome, kind: 'despesa' } })
    catsFinanceiras.set(nome, c.id)
  }

  const produtos: Product[] = []
  for (const [i, [name, categoria, custo, venda, estoque, minimo, marca]] of PRODUTOS.entries()) {
    const p = await prisma.product.create({
      data: {
        companyId: company.id,
        categoryId: categorias.get(categoria)!,
        supplierId: pick(fornecedores).id,
        name,
        sku: `AT-${String(i + 1).padStart(4, '0')}`,
        brand: marca,
        costPrice: custo,
        salePrice: venda,
        stock: estoque,
        minStock: minimo,
      },
    })
    produtos.push(p)
    // estoque inicial sempre nasce de uma movimentação, nunca de um número solto
    await prisma.stockMovement.create({
      data: {
        companyId: company.id, productId: p.id, userId: dono.id, type: MovementType.ENTRADA,
        quantity: estoque, unitCost: custo, totalCost: custo * estoque, balance: estoque,
        reason: 'Estoque inicial', origin: 'Seed',
        createdAt: new Date(Date.now() - 31 * 86400000),
      },
    })
  }

  const clientes: Customer[] = []
  for (const c of CLIENTES) {
    clientes.push(await prisma.customer.create({ data: { companyId: company.id, ...c } }))
  }

  console.log('Gerando vendas dos últimos 30 dias…')
  const pagamentos = [PaymentMethod.PIX, PaymentMethod.DINHEIRO, PaymentMethod.DEBITO, PaymentMethod.CREDITO, PaymentMethod.FIADO]
  const pesos = [38, 22, 20, 15, 5]
  const sorteiaPagamento = () => {
    let n = randInt(1, 100)
    for (let i = 0; i < pagamentos.length; i++) {
      n -= pesos[i]!
      if (n <= 0) return pagamentos[i]!
    }
    return PaymentMethod.PIX
  }

  let numero = 1
  for (let d = 29; d >= 0; d--) {
    const dia = new Date()
    dia.setDate(dia.getDate() - d)
    const fimDeSemana = [0, 5, 6].includes(dia.getDay())
    const vendasNoDia = d === 0 ? randInt(9, 14) : randInt(fimDeSemana ? 14 : 7, fimDeSemana ? 26 : 16)

    for (let v = 0; v < vendasNoDia; v++) {
      const quando = new Date(dia)
      // no dia de hoje, espalha as vendas só até a hora atual
      const ultimaHora = d === 0 ? Math.max(11, new Date().getHours()) : 22
      quando.setHours(randInt(10, ultimaHora), randInt(0, 59), randInt(0, 59), 0)
      if (quando > new Date()) quando.setTime(Date.now() - randInt(1, 90) * 60000)

      const itens = Array.from({ length: randInt(1, 4) }, () => pick(produtos))
      const unicos = [...new Map(itens.map((p) => [p.id, p])).values()]
      const pagamento = sorteiaPagamento()
      const linhas = unicos.map((p) => {
        const qtd = randInt(1, p.salePrice.toNumber() > 100 ? 1 : 6)
        return {
          productId: p.id, name: p.name, quantity: qtd,
          unitPrice: p.salePrice, unitCost: p.costPrice,
          total: p.salePrice.toNumber() * qtd,
        }
      })
      const subtotal = linhas.reduce((n, l) => n + l.total, 0)
      const desconto = Math.random() < 0.12 ? Math.round(subtotal * 0.05 * 100) / 100 : 0
      const custo = linhas.reduce((n, l) => n + l.unitCost.toNumber() * l.quantity, 0)
      const cliente = pagamento === PaymentMethod.FIADO ? pick(clientes) : Math.random() < 0.25 ? pick(clientes) : null

      const venda = await prisma.sale.create({
        data: {
          companyId: company.id, userId: pick([dono, gerente, operadora]).id,
          customerId: cliente?.id ?? null, number: numero++, payment: pagamento,
          subtotal, discount: desconto, total: subtotal - desconto, costTotal: custo,
          paid: pagamento !== PaymentMethod.FIADO,
          paidAt: pagamento !== PaymentMethod.FIADO ? quando : null,
          createdAt: quando,
          items: { create: linhas },
        },
      })

      for (const l of linhas) {
        const p = produtos.find((x) => x.id === l.productId)!
        await prisma.stockMovement.create({
          data: {
            companyId: company.id, productId: p.id, userId: venda.userId, saleId: venda.id,
            type: MovementType.VENDA, quantity: -l.quantity, unitCost: l.unitCost,
            totalCost: l.unitCost.toNumber() * l.quantity, balance: p.stock,
            reason: `Venda #${venda.number}`, origin: 'PDV', createdAt: quando,
          },
        })
      }

      if (pagamento === PaymentMethod.FIADO && cliente) {
        const vence = new Date(quando)
        vence.setDate(vence.getDate() + 15)
        await prisma.accountReceivable.create({
          data: {
            companyId: company.id, customerId: cliente.id, saleId: venda.id,
            description: `Fiado — venda #${venda.number}`, amount: subtotal - desconto,
            dueDate: vence, createdAt: quando,
          },
        })
      }
    }
  }

  console.log('Registrando entradas e perdas recentes…')
  const recentes: [number, number, MovementType, string][] = [
    [1, 5, MovementType.ENTRADA, 'Reposição semanal'],
    [3, 24, MovementType.ENTRADA, 'Pedido Central Beleza'],
    [6, 12, MovementType.ENTRADA, 'Pedido Atacadão Cosméticos'],
    [9, -2, MovementType.PERDA, 'Garrafa quebrada no balcão'],
    [14, -1, MovementType.PERDA, 'Produto vencido'],
  ]
  for (const [horasAtras, quantidade, tipo, motivo] of recentes) {
    const produto = pick(produtos)
    const quando = new Date(Date.now() - horasAtras * 3600000)
    const saldo = produto.stock + quantidade
    await prisma.product.update({ where: { id: produto.id }, data: { stock: saldo } })
    await prisma.stockMovement.create({
      data: {
        companyId: company.id, productId: produto.id, userId: dono.id, type: tipo,
        quantity: quantidade, unitCost: produto.costPrice,
        totalCost: produto.costPrice.toNumber() * Math.abs(quantidade), balance: saldo,
        reason: motivo, origin: tipo === MovementType.ENTRADA ? 'Compra' : 'Ajuste', createdAt: quando,
      },
    })
  }

  console.log('Lançando despesas e contas…')
  for (const [descricao, categoria, valor, diasAtras] of DESPESAS) {
    const quando = new Date()
    quando.setDate(quando.getDate() - diasAtras)
    await prisma.expense.create({
      data: {
        companyId: company.id, categoryId: catsFinanceiras.get(categoria) ?? null,
        description: descricao, amount: valor, spentAt: quando, createdAt: quando,
      },
    })
  }

  for (const [i, f] of fornecedores.entries()) {
    const vence = new Date()
    vence.setDate(vence.getDate() + (i + 1) * 7)
    await prisma.accountPayable.create({
      data: {
        companyId: company.id, supplierId: f.id,
        description: `Pedido de reposição — ${f.tradeName}`,
        amount: [1840.5, 960.0, 2310.75][i]!, dueDate: vence,
      },
    })
  }

  console.log('Abrindo o caixa do dia…')
  const caixa = await prisma.cashRegister.create({
    data: { companyId: company.id, userId: dono.id, openingAmount: 300, openedAt: new Date(new Date().setHours(9, 0, 0, 0)) },
  })
  await prisma.cashMovement.create({
    data: { registerId: caixa.id, userId: dono.id, type: CashMovementType.ABERTURA, amount: 300, description: 'Abertura do caixa' },
  })
  await prisma.cashMovement.create({
    data: { registerId: caixa.id, userId: dono.id, type: CashMovementType.SANGRIA, amount: -150, description: 'Sangria para o cofre' },
  })

  const totais = await prisma.sale.aggregate({ _count: true, _sum: { total: true }, where: { companyId: company.id } })
  console.log(`Pronto: ${totais._count} vendas, R$ ${totais._sum.total?.toFixed(2)} em faturamento.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
