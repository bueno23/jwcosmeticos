"use strict";(()=>{var tt='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',at={dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',produtos:'<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',movimentacoes:'<path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/>',relatorios:'<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',busca:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',mais:'<path d="M12 5v14M5 12h14"/>',baixar:'<path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"/>'},h=t=>`<svg ${tt}>${at[t]}</svg>`;async function p(t,a={}){let o;try{o=await fetch(t,{headers:{"Content-Type":"application/json"},...a})}catch{throw new Error("N\xE3o foi poss\xEDvel falar com o programa. Verifique se o terminal continua aberto.")}let e=await o.text(),n=e?JSON.parse(e):null;if(!o.ok)throw new Error(n?.erro??"Erro inesperado.");return n}var x=(t,a)=>({method:t,body:JSON.stringify(a)}),l={dashboard:()=>p("/api/dashboard"),produtos:(t="",a=!1)=>{let o=new URLSearchParams;return a&&o.set("incluir_inativos","1"),t.trim()&&o.set("busca",t.trim()),p(`/api/produtos?${o}`)},produto:t=>p(`/api/produtos/${t}`),criarProduto:t=>p("/api/produtos",x("POST",t)),atualizarProduto:(t,a)=>p(`/api/produtos/${t}`,x("PUT",a)),definirAtivo:(t,a)=>p(`/api/produtos/${t}/status`,x("POST",{ativo:a})),movimentacoes:(t="todos")=>p(t==="todos"?"/api/movimentacoes":`/api/movimentacoes?tipo=${t}`),registrarEntrada:t=>p("/api/movimentacoes/entrada",x("POST",t)),registrarSaida:t=>p("/api/movimentacoes/saida",x("POST",t))};var ot=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}),et=new Intl.NumberFormat("pt-BR"),c=t=>ot.format(Number(t||0)),u=t=>et.format(t);function q(t){if(!t)return"\u2014";let[a,o]=t.replace("T"," ").split(" "),[e,n,r]=a.split("-");return!e||!n||!r?t:o?`${r}/${n}/${e} ${o.slice(0,5)}`:`${r}/${n}/${e}`}function j(t){let a=new Date;a.setHours(0,0,0,0);let o=new Date(`${t}T00:00:00`);return Math.round((o.getTime()-a.getTime())/864e5)}function B(t){return t<0?`Venceu h\xE1 ${-t} ${-t===1?"dia":"dias"}`:t===0?"Vence hoje":`Vence em ${t} ${t===1?"dia":"dias"}`}var S=t=>t?t.charAt(0).toUpperCase()+t.slice(1):"\u2014";function i(t){return t==null?"":String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function s(t,a){let o=t.querySelector(a);if(!o)throw new Error(`Elemento n\xE3o encontrado: ${a}`);return o}var v=t=>t instanceof Error?t.message:"Erro inesperado.",y=s(document,"#modal-fundo"),_=s(document,"#modal-caixa"),rt=s(document,"#avisos"),A=null;function g(){y.hidden=!0,_.innerHTML="",A?.focus(),A=null}function I(t){return A=document.activeElement,_.innerHTML=t,y.hidden=!1,_.querySelector("input, select, button")?.focus(),_}y.addEventListener("mousedown",t=>{t.target===y&&g()});document.addEventListener("keydown",t=>{t.key==="Escape"&&!y.hidden&&g()});function F(t,a,o,e=!1){return new Promise(n=>{I(`
      <h2>${i(t)}</h2>
      <p class="modal-texto">${i(a)}</p>
      <div class="modal-botoes">
        <button class="btn" data-resposta="nao">Cancelar</button>
        <button class="btn ${e?"btn-perigo":"btn-primario"}" data-resposta="sim">${i(o)}</button>
      </div>
    `).querySelectorAll("[data-resposta]").forEach(d=>{d.addEventListener("click",()=>{g(),n(d.dataset.resposta==="sim")})})})}function b(t,a="ok"){let o=document.createElement("div");o.className="aviso",o.dataset.tipo=a,o.textContent=t,rt.append(o),setTimeout(()=>o.remove(),4e3)}function f(t,a,o=""){return`
    <header class="cabecalho">
      <div>
        <h1>${i(t)}</h1>
        <p>${i(a)}</p>
      </div>
      <div class="cabecalho-acoes">${o}</div>
    </header>
  `}var U={titulo:"Dashboard",async render(t){let a=await l.dashboard(),o=a.valores.venda-a.valores.custo,e=a.estoque_baixo.length,n=a.vencendo.length,r=a.estoque_baixo.map(m=>`
        <li>
          <div><strong>${i(m.nome)}</strong><small>M\xEDnimo ${u(m.estoque_minimo)}</small></div>
          <span class="selo selo-alerta">${u(m.quantidade_atual)} em estoque</span>
        </li>`).join(""),d=a.vencendo.map(m=>{let E=j(m.data_validade);return`
        <li>
          <div><strong>${i(m.produto_nome)}</strong><small>${u(m.quantidade)} un. \xB7 ${q(m.data_validade)}</small></div>
          <span class="selo ${E<=7?"selo-alerta":"selo-atencao"}">${B(E)}</span>
        </li>`}).join("");t.innerHTML=`
      ${f("Dashboard","Como est\xE1 o estoque hoje.")}
      <section class="resumo">
        <div class="valor-estoque">
          <span>Valor em estoque a pre\xE7o de custo</span>
          <strong class="numero">${c(a.valores.custo)}</strong>
          <dl>
            <div><dt>Valor de venda</dt><dd class="numero">${c(a.valores.venda)}</dd></div>
            <div><dt>Margem potencial</dt><dd class="numero">${c(o)}</dd></div>
          </dl>
        </div>
        <div class="indicadores">
          <div class="indicador"><span>Produtos ativos</span><strong class="numero">${u(a.total_produtos)}</strong></div>
          <div class="indicador" data-estado="${e?"alerta":""}"><span>Com estoque baixo</span><strong class="numero">${u(e)}</strong></div>
          <div class="indicador" data-estado="${n?"atencao":""}"><span>Lotes vencendo em 30 dias</span><strong class="numero">${u(n)}</strong></div>
        </div>
      </section>
      <section class="alertas">
        <div class="painel">
          <div class="painel-titulo"><h2>Repor estoque</h2><span>${e} ${e===1?"produto":"produtos"}</span></div>
          ${e?`<ul class="lista-linhas">${r}</ul>`:'<p class="vazio-curto">Nenhum produto abaixo do m\xEDnimo.</p>'}
        </div>
        <div class="painel">
          <div class="painel-titulo"><h2>Validade pr\xF3xima</h2><span>at\xE9 30 dias</span></div>
          ${n?`<ul class="lista-linhas">${d}</ul>`:'<p class="vazio-curto">Nenhum lote vence nos pr\xF3ximos 30 dias.</p>'}
        </div>
      </section>
    `}};var C=["entrada","saida","historico"],nt=["venda","perda","vencido","ajuste"],T="entrada",J=t=>{T=t},st=t=>t.length?t.map(a=>`<option value="${a.id}">${i(a.nome)} \u2014 ${u(a.quantidade_atual)} em estoque</option>`).join(""):"<option disabled selected>Nenhum produto cadastrado</option>";async function Q(t,a){let o=await l.produtos(),e=a==="entrada";t.innerHTML=`
    <form class="painel form-caixa" id="form-movimento" novalidate>
      <div class="grade-form">
        <label class="campo largo"><span>Produto</span><select class="entrada" id="m-produto">${st(o)}</select></label>
        <label class="campo"><span>Quantidade</span><input class="entrada" id="m-quantidade" type="number" min="1" step="1" inputmode="numeric" /></label>
        ${e?'<label class="campo"><span>Validade do lote</span><input class="entrada" id="m-validade" type="date" /><small>Opcional</small></label>':`<label class="campo"><span>Motivo</span><select class="entrada" id="m-motivo">${nt.map(r=>`<option value="${r}">${S(r)}</option>`).join("")}</select><small>Sai primeiro o lote que vence antes</small></label>`}
        <label class="campo largo"><span>Observa\xE7\xE3o</span><input class="entrada" id="m-observacao" type="text" /><small>Opcional</small></label>
      </div>
      <p class="erro-form" id="m-erro" role="alert"></p>
      <button class="btn btn-primario" type="submit" ${o.length?"":"disabled"}>${e?"Registrar entrada":"Registrar sa\xEDda"}</button>
    </form>`;let n=s(t,"#m-erro");s(t,"#form-movimento").addEventListener("submit",async r=>{r.preventDefault(),n.textContent="";let d=parseInt(s(t,"#m-quantidade").value,10);if(!d||d<=0){n.textContent="Informe uma quantidade inteira maior que zero.";return}let m=Number(s(t,"#m-produto").value),E=s(t,"#m-observacao").value.trim()||null;try{if(e){let M=s(t,"#m-validade").value||null;await l.registrarEntrada({produto_id:m,quantidade:d,data_validade:M,observacao:E})}else{let M=s(t,"#m-motivo").value;await l.registrarSaida({produto_id:m,quantidade:d,motivo:M,observacao:E})}b(e?"Entrada registrada.":"Sa\xEDda registrada."),await Q(t,a)}catch(M){n.textContent=v(M)}})}async function K(t,a="todos"){let o=await l.movimentacoes(a),e=n=>a===n?"selected":"";t.innerHTML=`
    <div class="filtros">
      <label class="campo"><span>Tipo</span>
        <select class="entrada" id="filtro-tipo">
          <option value="todos" ${e("todos")}>Todas</option>
          <option value="entrada" ${e("entrada")}>Entradas</option>
          <option value="saida" ${e("saida")}>Sa\xEDdas</option>
        </select>
      </label>
    </div>
    ${o.length?`<div class="tabela-caixa"><table>
            <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Motivo</th><th class="direita">Qtd.</th><th>Observa\xE7\xE3o</th></tr></thead>
            <tbody>${o.map(n=>`<tr>
                  <td class="numero">${q(n.data)}</td>
                  <td class="produto-nome">${i(n.produto_nome)}</td>
                  <td><span class="selo ${n.tipo==="entrada"?"selo-ok":"selo-neutro"}">${n.tipo==="entrada"?"Entrada":"Sa\xEDda"}</span></td>
                  <td>${S(n.motivo)}</td>
                  <td class="numero direita">${n.tipo==="entrada"?"+":"\u2212"}${u(n.quantidade)}</td>
                  <td>${i(n.observacao)||"\u2014"}</td>
                </tr>`).join("")}</tbody>
          </table></div>`:'<div class="painel vazio"><strong>Nenhuma movimenta\xE7\xE3o encontrada</strong>Registre uma entrada ou sa\xEDda para ver o hist\xF3rico.</div>'}`,s(t,"#filtro-tipo").addEventListener("change",n=>{K(t,n.target.value)})}var it={entrada:"Entrada",saida:"Sa\xEDda",historico:"Hist\xF3rico"},W={titulo:"Movimenta\xE7\xF5es",async render(t){t.innerHTML=`
      ${f("Movimenta\xE7\xF5es","Registre o que entra e o que sai do estoque.")}
      <div class="abas" role="tablist">
        ${C.map(e=>`<button class="aba" role="tab" data-aba="${e}" aria-selected="${e===T}">${it[e]}</button>`).join("")}
      </div>
      <div id="aba-conteudo"></div>`;let a=s(t,"#aba-conteudo"),o=async()=>{t.querySelectorAll(".aba").forEach(e=>e.setAttribute("aria-selected",String(e.dataset.aba===T)));try{T==="historico"?await K(a):await Q(a,T)}catch(e){b(v(e),"erro")}};t.querySelectorAll(".aba").forEach(e=>{e.addEventListener("click",()=>{T=e.dataset.aba,o()})}),await o()}};var P="",D=!1,dt=t=>!!t.ativo;function lt(t){let a=Math.max(t.estoque_minimo*2,1),o=Math.min(100,Math.round(t.quantidade_atual/a*100));return`
    <div class="nivel" data-estado="${t.quantidade_atual<=t.estoque_minimo?"baixo":"ok"}">
      <span class="numero">${u(t.quantidade_atual)}</span>
      <div class="nivel-trilho"><div class="nivel-preenchimento" style="width:${o}%"></div></div>
    </div>`}function ct(t){let a=dt(t),o=[t.marca,t.categoria].filter(Boolean).map(i).join(" \xB7 ");return`
    <tr class="${a?"":"inativo"}">
      <td class="produto-nome">${i(t.nome)}${o?`<small>${o}</small>`:""}</td>
      <td>${i(t.codigo)||"\u2014"}</td>
      <td>${lt(t)}</td>
      <td class="numero direita">${u(t.estoque_minimo)}</td>
      <td class="numero direita">${c(t.preco_custo)}</td>
      <td class="numero direita">${c(t.preco_venda)}</td>
      <td>${a?"":'<span class="selo selo-neutro">Inativo</span>'}</td>
      <td class="acoes">
        <button class="btn btn-pequeno" data-acao="editar" data-id="${t.id}">Editar</button>
        <button class="btn btn-pequeno" data-acao="status" data-id="${t.id}" data-ativo="${a}">${a?"Desativar":"Reativar"}</button>
      </td>
    </tr>`}async function L(t){let a=s(t,"#tabela-produtos"),o=await l.produtos(P,D);if(!o.length){a.innerHTML=`<div class="painel vazio"><strong>Nenhum produto encontrado</strong>${P?"Tente outro termo de busca.":"Cadastre o primeiro produto para come\xE7ar."}</div>`;return}a.innerHTML=`
    <div class="tabela-caixa">
      <table>
        <thead><tr>
          <th>Produto</th><th>C\xF3digo</th><th>Em estoque</th><th class="direita">M\xEDnimo</th>
          <th class="direita">Custo</th><th class="direita">Venda</th><th></th><th></th>
        </tr></thead>
        <tbody>${o.map(ct).join("")}</tbody>
      </table>
    </div>`,a.querySelectorAll("[data-acao]").forEach(e=>{e.addEventListener("click",async()=>{let n=Number(e.dataset.id);try{if(e.dataset.acao==="editar"){w(t,await l.produto(n));return}let r=e.dataset.ativo==="true";if(!await F(r?"Desativar produto?":"Reativar produto?",r?"Ele sai das listas de movimenta\xE7\xE3o, mas o hist\xF3rico continua guardado.":"Ele volta a aparecer nas listas de movimenta\xE7\xE3o.",r?"Desativar":"Reativar",r))return;await l.definirAtivo(n,!r),b(r?"Produto desativado.":"Produto reativado."),await L(t)}catch(r){b(v(r),"erro")}})})}function $(t,a,o,e="text",n=!1){let r=o?.[t];return`
    <label class="campo ${n?"largo":""}">
      <span>${a}</span>
      <input class="entrada" id="campo-${t}" type="${e}"${e==="number"?' min="0" step="any" inputmode="decimal"':""} value="${r==null?"":i(r)}" />
    </label>`}function k(t,a){return s(t,a).value.trim()||null}function w(t,a){let o=I(`
    <h2>${a?"Editar produto":"Novo produto"}</h2>
    <p class="modal-texto">${a?"Altere os dados e salve.":"Preencha os dados do produto. S\xF3 o nome \xE9 obrigat\xF3rio."}</p>
    <div class="grade-form">
      ${$("nome","Nome",a,"text",!0)}
      ${$("marca","Marca",a)}
      ${$("categoria","Categoria",a)}
      ${$("codigo","C\xF3digo / SKU",a,"text",!0)}
      ${$("preco_custo","Pre\xE7o de custo (R$)",a,"number")}
      ${$("preco_venda","Pre\xE7o de venda (R$)",a,"number")}
      ${$("estoque_minimo","Estoque m\xEDnimo",a,"number",!0)}
    </div>
    <p class="erro-form" id="form-erro" role="alert"></p>
    <div class="modal-botoes">
      <button class="btn" id="botao-cancelar">Cancelar</button>
      <button class="btn btn-primario" id="botao-salvar">Salvar produto</button>
    </div>
  `),e=s(o,"#form-erro");s(o,"#botao-cancelar").addEventListener("click",g),s(o,"#botao-salvar").addEventListener("click",async()=>{e.textContent="";let n=s(o,"#campo-nome").value.trim();if(!n){e.textContent="Informe o nome do produto.";return}let r={nome:n,categoria:k(o,"#campo-categoria"),marca:k(o,"#campo-marca"),codigo:k(o,"#campo-codigo"),preco_custo:parseFloat(s(o,"#campo-preco_custo").value||"0"),preco_venda:parseFloat(s(o,"#campo-preco_venda").value||"0"),estoque_minimo:parseInt(s(o,"#campo-estoque_minimo").value||"0",10)};if([r.preco_custo,r.preco_venda,r.estoque_minimo].some(Number.isNaN)){e.textContent="Pre\xE7os e estoque m\xEDnimo precisam ser n\xFAmeros.";return}try{a?await l.atualizarProduto(a.id,r):await l.criarProduto(r),g(),b(a?"Produto atualizado.":"Produto cadastrado."),await L(t)}catch(d){e.textContent=v(d)}})}var Z={titulo:"Produtos",async render(t){t.innerHTML=`
      ${f("Produtos","Cadastro, pre\xE7os e n\xEDvel de estoque.",`<button class="btn btn-primario" id="botao-novo">${h("mais")}Novo produto</button>`)}
      <div class="filtros">
        <label class="busca">
          ${h("busca")}
          <span class="so-leitor">Buscar produto</span>
          <input class="entrada" id="campo-busca" type="search" placeholder="Buscar produto" value="${i(P)}" />
        </label>
        <label class="marcador"><input type="checkbox" id="check-inativos" ${D?"checked":""} />Mostrar inativos</label>
      </div>
      <div id="tabela-produtos"></div>
    `;let a;s(t,"#campo-busca").addEventListener("input",o=>{P=o.target.value,window.clearTimeout(a),a=window.setTimeout(()=>{L(t)},200)}),s(t,"#check-inativos").addEventListener("change",o=>{D=o.target.checked,L(t)}),s(t,"#botao-novo").addEventListener("click",()=>w(t,null)),await L(t)}};var z={titulo:"Relat\xF3rios",async render(t){let a=await l.produtos(),o=a.reduce((r,d)=>r+d.quantidade_atual*d.preco_custo,0),e=a.reduce((r,d)=>r+d.quantidade_atual*d.preco_venda,0),n=`
      <a class="btn" href="/api/exportar/produtos.csv">${h("baixar")}Produtos (CSV)</a>
      <a class="btn" href="/api/exportar/movimentacoes.csv">${h("baixar")}Movimenta\xE7\xF5es (CSV)</a>`;t.innerHTML=`
      ${f("Relat\xF3rios","Valor do estoque por produto. Os CSV abrem direto no Excel.",n)}
      <section class="totais">
        <div class="indicador"><span>Valor a pre\xE7o de custo</span><strong class="numero">${c(o)}</strong></div>
        <div class="indicador"><span>Valor a pre\xE7o de venda</span><strong class="numero">${c(e)}</strong></div>
        <div class="indicador"><span>Margem potencial</span><strong class="numero">${c(e-o)}</strong></div>
      </section>
      ${a.length?`<div class="tabela-caixa"><table>
              <thead><tr><th>Produto</th><th class="direita">Qtd.</th><th class="direita">Custo unit.</th><th class="direita">Total custo</th><th class="direita">Venda unit.</th><th class="direita">Total venda</th></tr></thead>
              <tbody>${a.map(r=>{let d=r.quantidade_atual<=r.estoque_minimo;return`<tr>
                    <td class="produto-nome">${i(r.nome)} ${d?'<span class="selo selo-alerta">Estoque baixo</span>':""}</td>
                    <td class="numero direita">${u(r.quantidade_atual)}</td>
                    <td class="numero direita">${c(r.preco_custo)}</td>
                    <td class="numero direita">${c(r.quantidade_atual*r.preco_custo)}</td>
                    <td class="numero direita">${c(r.preco_venda)}</td>
                    <td class="numero direita">${c(r.quantidade_atual*r.preco_venda)}</td>
                  </tr>`}).join("")}</tbody>
            </table></div>`:'<div class="painel vazio"><strong>Nenhum produto cadastrado</strong>Cadastre produtos para ver o valor do estoque.</div>'}`}};var H={dashboard:U,produtos:Z,movimentacoes:W,relatorios:z},ut={dashboard:"dashboard",produtos:"produtos",movimentacoes:"movimentacoes",relatorios:"relatorios"},R=s(document,"#conteudo"),V=s(document,"#menu-lista");V.innerHTML=Object.entries(H).map(([t,a])=>`<button class="menu-item" data-tela="${t}">${h(ut[t])}${i(a.titulo)}</button>`).join("");s(document,"#versao").textContent="Vers\xE3o 1.0.0";var G="";async function Y(t){G=t,V.querySelectorAll(".menu-item").forEach(a=>{a.dataset.tela===t?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")}),document.title=`${H[t].titulo} \xB7 JW Cosm\xE9ticos`;try{await H[t].render(R),G===t&&window.scrollTo(0,0)}catch(a){R.innerHTML=`<div class="painel vazio"><strong>N\xE3o foi poss\xEDvel carregar esta tela</strong>${i(v(a))}</div>`,b(v(a),"erro")}}V.addEventListener("click",t=>{let a=t.target.closest("[data-tela]");a?.dataset.tela&&Y(a.dataset.tela)});var O=new URLSearchParams(location.search),N=O.get("aba");N&&C.includes(N)&&J(N);var X=O.get("tela")??"";Y(X in H?X:"dashboard").then(()=>{O.get("modal")==="produto"&&w(R,null)});})();
