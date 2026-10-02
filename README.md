# JW Cosméticos Multimarcas — Controle de Estoque

Sistema de controle de estoque para uso local, com dados salvos em um arquivo SQLite (`estoque.db`) no próprio computador. Não precisa de internet.

A interface roda como uma página local que abre sozinha no seu navegador (Safari/Chrome) — por baixo dos panos é só um servidor Python rodando na sua própria máquina, nada sai do computador.

## Como instalar

Nenhuma instalação extra é necessária — o programa usa apenas bibliotecas que já vêm junto com o Python (biblioteca padrão + SQLite). Só precisa ter o Python 3 instalado (o Mac já vem com ele).

## Como usar

```bash
python3 main.py
```

O terminal vai mostrar um endereço (`http://127.0.0.1:8899/`) e abrir essa página automaticamente no seu navegador padrão. **Deixe o terminal aberto** enquanto estiver usando o programa — fechar o terminal (ou apertar Ctrl+C nele) encerra o servidor. Se o navegador não abrir sozinho, copie o endereço mostrado no terminal e cole na barra de endereços.

Na primeira execução, o arquivo `estoque.db` é criado automaticamente na pasta do projeto — é nele que ficam todos os dados. Faça backups periódicos desse arquivo (ou use a exportação em CSV, na tela de Relatórios).

## Funcionalidades

- **Dashboard**: resumo de produtos ativos, valor total em estoque e alertas de estoque baixo / validade próxima.
- **Produtos**: cadastro, edição, busca e ativação/desativação (o histórico não é apagado ao desativar um produto).
- **Movimentações**:
  - *Entrada*: registra a compra/reposição de um produto, com data de validade do lote.
  - *Saída*: registra venda, perda, produto vencido ou ajuste — o sistema retira automaticamente primeiro dos lotes que vencem mais cedo.
  - *Histórico*: consulta de todas as movimentações, com filtro por tipo.
- **Relatórios**: valor total em estoque (por preço de custo e de venda), destaque de produtos com estoque baixo, e exportação de produtos/movimentações em CSV (compatível com Excel).

## Próximos passos possíveis

- Criar um atalho/ícone que rode `python3 main.py` com duplo clique, sem precisar abrir o terminal manualmente.
- Backup automático do `estoque.db` em outro local (pendrive, nuvem).
