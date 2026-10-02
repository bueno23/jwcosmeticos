const conteudo = document.getElementById("conteudo");
const modalFundo = document.getElementById("modal-fundo");
const modalCaixa = document.getElementById("modal-caixa");
const MOTIVOS_SAIDA = ["venda", "perda", "vencido", "ajuste"];

function esc(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatoMoeda(valor) {
  return "R$ " + Number(valor || 0).toFixed(2);
}

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!resposta.ok) {
    throw new Error((dados && dados.erro) || "Erro inesperado.");
  }
  return dados;
}

function fecharModal() {
  modalFundo.classList.add("oculto");
  modalCaixa.innerHTML = "";
}

function abrirModal(html) {
  modalCaixa.innerHTML = html;
  modalFundo.classList.remove("oculto");
}

modalFundo.addEventListener("click", (evento) => {
  if (evento.target === modalFundo) fecharModal();
});

const TELAS = {
  dashboard: renderDashboard,
  produtos: renderProdutos,
  movimentacoes: renderMovimentacoes,
  relatorios: renderRelatorios,
};

function navegarPara(nome) {
  document.querySelectorAll(".menu-item").forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.tela === nome);
  });
  TELAS[nome]();
}

document.querySelectorAll(".menu-item").forEach((botao) => {
  botao.addEventListener("click", () => navegarPara(botao.dataset.tela));
});

// ---------------------------------------------------------------- dashboard --

async function renderDashboard() {
  conteudo.innerHTML = "<h1>Dashboard</h1><p class='vazio'>Carregando...</p>";
  const dados = await api("/api/dashboard");

  conteudo.innerHTML = `
    <h1>Dashboard</h1>
    <div class="cards">
      <div class="card">
        <div class="card-titulo">Produtos ativos</div>
        <div class="card-valor">${dados.total_produtos}</div>
      </div>
      <div class="card">
        <div class="card-titulo">Valor em estoque (custo)</div>
        <div class="card-valor">${formatoMoeda(dados.valores.custo)}</div>
      </div>
      <div class="card">
        <div class="card-titulo">Alertas</div>
        <div class="card-valor">${dados.estoque_baixo.length} baixo · ${dados.vencendo.length} vencendo</div>
      </div>
    </div>
    <div class="duas-colunas">
      <div>
        <h2>Estoque baixo</h2>
        <div class="lista-alerta">
          ${
            dados.estoque_baixo.length
              ? "<ul>" + dados.estoque_baixo.map((p) => `<li>${esc(p.nome)} — ${p.quantidade_atual} em estoque (mínimo: ${p.estoque_minimo})</li>`).join("") + "</ul>"
              : "<p class='vazio'>Nenhum produto com estoque baixo.</p>"
          }
        </div>
      </div>
      <div>
        <h2>Vencendo em até 30 dias</h2>
        <div class="lista-alerta">
          ${
            dados.vencendo.length
              ? "<ul>" + dados.vencendo.map((l) => `<li>${esc(l.produto_nome)} — ${l.quantidade} un. vencendo em ${esc(l.data_validade)}</li>`).join("") + "</ul>"
              : "<p class='vazio'>Nenhum lote vencendo nos próximos 30 dias.</p>"
          }
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------- produtos --

let produtosCacheBusca = "";
let produtosMostrarInativos = false;

async function renderProdutos() {
  conteudo.innerHTML = `
    <div class="barra-topo">
      <h1>Produtos</h1>
      <div style="display:flex; gap:10px;">
        <input type="text" id="campo-busca" placeholder="Buscar por nome, categoria, marca ou código" style="width:320px" value="${esc(produtosCacheBusca)}" />
        <button class="primario" id="botao-novo-produto">+ Novo produto</button>
      </div>
    </div>
    <div class="barra-acoes">
      <label style="display:flex; align-items:center; gap:6px; margin:0;">
        <input type="checkbox" id="check-inativos" ${produtosMostrarInativos ? "checked" : ""} />
        Mostrar inativos
      </label>
    </div>
    <div id="tabela-produtos"></div>
  `;

  document.getElementById("campo-busca").addEventListener("input", (evento) => {
    produtosCacheBusca = evento.target.value;
    carregarTabelaProdutos();
  });
  document.getElementById("check-inativos").addEventListener("change", (evento) => {
    produtosMostrarInativos = evento.target.checked;
    carregarTabelaProdutos();
  });
  document.getElementById("botao-novo-produto").addEventListener("click", () => abrirFormularioProduto(null));

  await carregarTabelaProdutos();
}

async function carregarTabelaProdutos() {
  const alvo = document.getElementById("tabela-produtos");
  const parametros = new URLSearchParams();
  if (produtosMostrarInativos) parametros.set("incluir_inativos", "1");
  if (produtosCacheBusca.trim()) parametros.set("busca", produtosCacheBusca.trim());

  const produtos = await api("/api/produtos?" + parametros.toString());

  if (!produtos.length) {
    alvo.innerHTML = "<p class='vazio'>Nenhum produto encontrado.</p>";
    return;
  }

  alvo.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nome</th><th>Categoria</th><th>Marca</th><th>Código</th>
          <th>Qtd.</th><th>Mín.</th><th>Preço custo</th><th>Preço venda</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${produtos.map((p) => `
          <tr class="${p.ativo ? "" : "inativo"}">
            <td>${esc(p.nome)}</td>
            <td>${esc(p.categoria)}</td>
            <td>${esc(p.marca)}</td>
            <td>${esc(p.codigo)}</td>
            <td>${p.quantidade_atual}</td>
            <td>${p.estoque_minimo}</td>
            <td>${formatoMoeda(p.preco_custo)}</td>
            <td>${formatoMoeda(p.preco_venda)}</td>
            <td>
              <button data-acao="editar" data-id="${p.id}">Editar</button>
              <button data-acao="status" data-id="${p.id}" data-ativo="${p.ativo}">${p.ativo ? "Desativar" : "Ativar"}</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  alvo.querySelectorAll('button[data-acao="editar"]').forEach((botao) => {
    botao.addEventListener("click", async () => {
      const produto = await api(`/api/produtos/${botao.dataset.id}`);
      abrirFormularioProduto(produto);
    });
  });

  alvo.querySelectorAll('button[data-acao="status"]').forEach((botao) => {
    botao.addEventListener("click", async () => {
      const ativo = botao.dataset.ativo === "true";
      const acao = ativo ? "desativar" : "ativar";
      if (!confirm(`Deseja ${acao} este produto?`)) return;
      await api(`/api/produtos/${botao.dataset.id}/status`, {
        method: "POST",
        body: JSON.stringify({ ativo: !ativo }),
      });
      carregarTabelaProdutos();
    });
  });
}

function abrirFormularioProduto(produto) {
  const campo = (chave, rotulo, tipo = "text") => `
    <label>${rotulo}</label>
    <input type="${tipo}" id="campo-${chave}" style="width:100%"
      value="${produto && produto[chave] !== null && produto[chave] !== undefined ? esc(produto[chave]) : ""}" />
  `;

  abrirModal(`
    <h2 style="font-size:18px; margin-bottom:4px;">${produto ? "Editar produto" : "Novo produto"}</h2>
    <div class="formulario">
      ${campo("nome", "Nome *")}
      ${campo("categoria", "Categoria")}
      ${campo("marca", "Marca")}
      ${campo("codigo", "Código / SKU")}
      ${campo("preco_custo", "Preço de custo (R$)", "number")}
      ${campo("preco_venda", "Preço de venda (R$)", "number")}
      ${campo("estoque_minimo", "Estoque mínimo", "number")}
      <p class="mensagem erro" id="form-erro"></p>
      <div class="modal-botoes">
        <button id="botao-cancelar">Cancelar</button>
        <button class="primario" id="botao-salvar">Salvar</button>
      </div>
    </div>
  `);

  document.getElementById("botao-cancelar").addEventListener("click", fecharModal);
  document.getElementById("botao-salvar").addEventListener("click", async () => {
    const nome = document.getElementById("campo-nome").value.trim();
    const erroEl = document.getElementById("form-erro");
    erroEl.textContent = "";
    if (!nome) {
      erroEl.textContent = "O nome do produto é obrigatório.";
      return;
    }
    const dados = {
      nome,
      categoria: document.getElementById("campo-categoria").value.trim() || null,
      marca: document.getElementById("campo-marca").value.trim() || null,
      codigo: document.getElementById("campo-codigo").value.trim() || null,
      preco_custo: parseFloat(document.getElementById("campo-preco_custo").value || "0"),
      preco_venda: parseFloat(document.getElementById("campo-preco_venda").value || "0"),
      estoque_minimo: parseInt(document.getElementById("campo-estoque_minimo").value || "0", 10),
    };
    if (Number.isNaN(dados.preco_custo) || Number.isNaN(dados.preco_venda) || Number.isNaN(dados.estoque_minimo)) {
      erroEl.textContent = "Preços e estoque mínimo devem ser números válidos.";
      return;
    }
    try {
      if (produto) {
        await api(`/api/produtos/${produto.id}`, { method: "PUT", body: JSON.stringify(dados) });
      } else {
        await api("/api/produtos", { method: "POST", body: JSON.stringify(dados) });
      }
      fecharModal();
      carregarTabelaProdutos();
    } catch (erro) {
      erroEl.textContent = erro.message;
    }
  });
}

// ------------------------------------------------------------ movimentações --

let abaMovimentacaoAtiva = "entrada";

async function renderMovimentacoes() {
  conteudo.innerHTML = `
    <h1>Movimentações</h1>
    <div class="abas">
      <button class="aba-botao" data-aba="entrada">Entrada</button>
      <button class="aba-botao" data-aba="saida">Saída</button>
      <button class="aba-botao" data-aba="historico">Histórico</button>
    </div>
    <div id="aba-conteudo"></div>
  `;

  conteudo.querySelectorAll(".aba-botao").forEach((botao) => {
    botao.addEventListener("click", () => {
      abaMovimentacaoAtiva = botao.dataset.aba;
      atualizarAbaMovimentacoes();
    });
  });

  await atualizarAbaMovimentacoes();
}

function atualizarAbaMovimentacoes() {
  conteudo.querySelectorAll(".aba-botao").forEach((botao) => {
    botao.classList.toggle("ativa", botao.dataset.aba === abaMovimentacaoAtiva);
  });
  if (abaMovimentacaoAtiva === "entrada") return renderAbaEntrada();
  if (abaMovimentacaoAtiva === "saida") return renderAbaSaida();
  return renderAbaHistorico();
}

async function renderAbaEntrada() {
  const alvo = document.getElementById("aba-conteudo");
  const produtos = await api("/api/produtos");

  alvo.innerHTML = `
    <div class="formulario">
      <label>Produto</label>
      <select id="entrada-produto" style="width:100%">
        ${produtos.length ? produtos.map((p) => `<option value="${p.id}">${esc(p.nome)} (estoque: ${p.quantidade_atual})</option>`).join("") : "<option disabled>Nenhum produto cadastrado</option>"}
      </select>
      <label>Quantidade</label>
      <input type="number" id="entrada-quantidade" min="1" />
      <label>Data de validade do lote (opcional)</label>
      <input type="date" id="entrada-validade" />
      <label>Observação (opcional)</label>
      <input type="text" id="entrada-observacao" style="width:100%" />
      <p class="mensagem" id="entrada-msg"></p>
      <button class="primario" id="entrada-botao" style="margin-top:10px" ${produtos.length ? "" : "disabled"}>Registrar entrada</button>
    </div>
  `;

  document.getElementById("entrada-botao").addEventListener("click", async () => {
    const msg = document.getElementById("entrada-msg");
    msg.textContent = "";
    msg.className = "mensagem";

    const quantidade = parseInt(document.getElementById("entrada-quantidade").value, 10);
    if (!quantidade || quantidade <= 0) {
      msg.textContent = "Informe uma quantidade válida (número inteiro maior que zero).";
      msg.classList.add("erro");
      return;
    }
    try {
      await api("/api/movimentacoes/entrada", {
        method: "POST",
        body: JSON.stringify({
          produto_id: document.getElementById("entrada-produto").value,
          quantidade,
          data_validade: document.getElementById("entrada-validade").value || null,
          observacao: document.getElementById("entrada-observacao").value.trim() || null,
        }),
      });
      msg.textContent = "Entrada registrada com sucesso.";
      msg.classList.add("sucesso");
      renderAbaEntrada();
    } catch (erro) {
      msg.textContent = erro.message;
      msg.classList.add("erro");
    }
  });
}

async function renderAbaSaida() {
  const alvo = document.getElementById("aba-conteudo");
  const produtos = await api("/api/produtos");

  alvo.innerHTML = `
    <div class="formulario">
      <label>Produto</label>
      <select id="saida-produto" style="width:100%">
        ${produtos.length ? produtos.map((p) => `<option value="${p.id}">${esc(p.nome)} (estoque: ${p.quantidade_atual})</option>`).join("") : "<option disabled>Nenhum produto cadastrado</option>"}
      </select>
      <label>Quantidade</label>
      <input type="number" id="saida-quantidade" min="1" />
      <label>Motivo</label>
      <select id="saida-motivo">
        ${MOTIVOS_SAIDA.map((m) => `<option value="${m}">${m}</option>`).join("")}
      </select>
      <label>Observação (opcional)</label>
      <input type="text" id="saida-observacao" style="width:100%" />
      <p class="mensagem" id="saida-msg"></p>
      <button class="primario" id="saida-botao" style="margin-top:10px" ${produtos.length ? "" : "disabled"}>Registrar saída</button>
    </div>
  `;

  document.getElementById("saida-botao").addEventListener("click", async () => {
    const msg = document.getElementById("saida-msg");
    msg.textContent = "";
    msg.className = "mensagem";

    const quantidade = parseInt(document.getElementById("saida-quantidade").value, 10);
    if (!quantidade || quantidade <= 0) {
      msg.textContent = "Informe uma quantidade válida (número inteiro maior que zero).";
      msg.classList.add("erro");
      return;
    }
    try {
      await api("/api/movimentacoes/saida", {
        method: "POST",
        body: JSON.stringify({
          produto_id: document.getElementById("saida-produto").value,
          quantidade,
          motivo: document.getElementById("saida-motivo").value,
          observacao: document.getElementById("saida-observacao").value.trim() || null,
        }),
      });
      msg.textContent = "Saída registrada com sucesso.";
      msg.classList.add("sucesso");
      renderAbaSaida();
    } catch (erro) {
      msg.textContent = erro.message;
      msg.classList.add("erro");
    }
  });
}

async function renderAbaHistorico(tipoFiltro) {
  const alvo = document.getElementById("aba-conteudo");
  const tipo = tipoFiltro || "todos";
  const sufixo = tipo !== "todos" ? "?tipo=" + tipo : "";
  const movimentacoes = await api("/api/movimentacoes" + sufixo);

  alvo.innerHTML = `
    <div class="barra-acoes">
      <label style="margin:0;">Tipo:</label>
      <select id="historico-tipo" style="width:auto">
        <option value="todos" ${tipo === "todos" ? "selected" : ""}>todos</option>
        <option value="entrada" ${tipo === "entrada" ? "selected" : ""}>entrada</option>
        <option value="saida" ${tipo === "saida" ? "selected" : ""}>saida</option>
      </select>
    </div>
    ${
      movimentacoes.length
        ? `<table>
            <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Motivo</th><th>Qtd.</th><th>Observação</th></tr></thead>
            <tbody>
              ${movimentacoes.map((m) => `
                <tr>
                  <td>${esc(m.data)}</td><td>${esc(m.produto_nome)}</td><td>${esc(m.tipo)}</td>
                  <td>${esc(m.motivo)}</td><td>${m.quantidade}</td><td>${esc(m.observacao)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>`
        : "<p class='vazio'>Nenhuma movimentação encontrada.</p>"
    }
  `;

  document.getElementById("historico-tipo").addEventListener("change", (evento) => {
    renderAbaHistorico(evento.target.value);
  });
}

// ------------------------------------------------------------- relatórios --

async function renderRelatorios() {
  conteudo.innerHTML = "<h1>Relatórios</h1><p class='vazio'>Carregando...</p>";
  const produtos = await api("/api/produtos");
  const totalCusto = produtos.reduce((soma, p) => soma + p.quantidade_atual * p.preco_custo, 0);
  const totalVenda = produtos.reduce((soma, p) => soma + p.quantidade_atual * p.preco_venda, 0);

  conteudo.innerHTML = `
    <h1>Relatórios</h1>
    <p>Valor total em estoque — custo: <strong>${formatoMoeda(totalCusto)}</strong> &nbsp;|&nbsp; venda: <strong>${formatoMoeda(totalVenda)}</strong></p>
    <div class="barra-acoes">
      <a class="botao-link" href="/api/exportar/produtos.csv">Exportar produtos (CSV)</a>
      <a class="botao-link" href="/api/exportar/movimentacoes.csv">Exportar movimentações (CSV)</a>
    </div>
    ${
      produtos.length
        ? `<table>
            <thead><tr><th>Produto</th><th>Qtd.</th><th>Preço custo</th><th>Valor (custo)</th><th>Preço venda</th><th>Valor (venda)</th></tr></thead>
            <tbody>
              ${produtos.map((p) => `
                <tr class="${p.quantidade_atual <= p.estoque_minimo ? "baixo" : ""}">
                  <td>${esc(p.nome)}</td><td>${p.quantidade_atual}</td>
                  <td>${formatoMoeda(p.preco_custo)}</td><td>${formatoMoeda(p.quantidade_atual * p.preco_custo)}</td>
                  <td>${formatoMoeda(p.preco_venda)}</td><td>${formatoMoeda(p.quantidade_atual * p.preco_venda)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>`
        : "<p class='vazio'>Nenhum produto cadastrado.</p>"
    }
    <p class="rodape-nota">Produtos com estoque baixo aparecem destacados em vermelho.</p>
  `;
}

const parametrosURL = new URLSearchParams(location.search);
const abaInicial = parametrosURL.get("aba");
if (["entrada", "saida", "historico"].includes(abaInicial)) {
  abaMovimentacaoAtiva = abaInicial;
}
const telaInicial = parametrosURL.get("tela");
navegarPara(TELAS[telaInicial] ? telaInicial : "dashboard");

if (parametrosURL.get("modal") === "produto") {
  setTimeout(() => abrirFormularioProduto(null), 300);
}
