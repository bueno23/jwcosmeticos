from datetime import date, timedelta

from app.database import conectar

MOTIVOS_SAIDA = ["venda", "perda", "vencido", "ajuste"]
DIAS_ALERTA_VALIDADE = 30


class EstoqueInsuficienteError(Exception):
    pass


# ---------------------------------------------------------------- produtos --

def listar_produtos(incluir_inativos=False, busca=None):
    conn = conectar()
    try:
        sql = "SELECT * FROM produtos"
        condicoes = []
        parametros = []

        if not incluir_inativos:
            condicoes.append("ativo = 1")
        if busca:
            condicoes.append("(nome LIKE ? OR categoria LIKE ? OR marca LIKE ? OR codigo LIKE ?)")
            termo = f"%{busca}%"
            parametros.extend([termo, termo, termo, termo])

        if condicoes:
            sql += " WHERE " + " AND ".join(condicoes)
        sql += " ORDER BY nome COLLATE NOCASE"

        produtos = [dict(row) for row in conn.execute(sql, parametros).fetchall()]
        for produto in produtos:
            produto["quantidade_atual"] = _quantidade_atual(conn, produto["id"])
        return produtos
    finally:
        conn.close()


def obter_produto(produto_id):
    conn = conectar()
    try:
        row = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
        if row is None:
            return None
        produto = dict(row)
        produto["quantidade_atual"] = _quantidade_atual(conn, produto_id)
        return produto
    finally:
        conn.close()


def criar_produto(dados):
    conn = conectar()
    try:
        cursor = conn.execute(
            """
            INSERT INTO produtos (nome, categoria, marca, codigo, preco_custo, preco_venda, estoque_minimo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                dados["nome"],
                dados.get("categoria"),
                dados.get("marca"),
                dados.get("codigo"),
                dados.get("preco_custo", 0),
                dados.get("preco_venda", 0),
                dados.get("estoque_minimo", 0),
            ),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def atualizar_produto(produto_id, dados):
    conn = conectar()
    try:
        conn.execute(
            """
            UPDATE produtos
            SET nome = ?, categoria = ?, marca = ?, codigo = ?,
                preco_custo = ?, preco_venda = ?, estoque_minimo = ?
            WHERE id = ?
            """,
            (
                dados["nome"],
                dados.get("categoria"),
                dados.get("marca"),
                dados.get("codigo"),
                dados.get("preco_custo", 0),
                dados.get("preco_venda", 0),
                dados.get("estoque_minimo", 0),
                produto_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def definir_produto_ativo(produto_id, ativo):
    conn = conectar()
    try:
        conn.execute("UPDATE produtos SET ativo = ? WHERE id = ?", (1 if ativo else 0, produto_id))
        conn.commit()
    finally:
        conn.close()


def _quantidade_atual(conn, produto_id):
    row = conn.execute(
        "SELECT COALESCE(SUM(quantidade), 0) AS total FROM lotes WHERE produto_id = ? AND quantidade > 0",
        (produto_id,),
    ).fetchone()
    return row["total"]


# ------------------------------------------------------------ movimentações --

def registrar_entrada(produto_id, quantidade, data_validade=None, observacao=None):
    if quantidade <= 0:
        raise ValueError("Quantidade deve ser maior que zero.")

    conn = conectar()
    try:
        cursor = conn.execute(
            "INSERT INTO lotes (produto_id, quantidade, data_validade) VALUES (?, ?, ?)",
            (produto_id, quantidade, data_validade),
        )
        lote_id = cursor.lastrowid
        conn.execute(
            """
            INSERT INTO movimentacoes (produto_id, lote_id, tipo, motivo, quantidade, observacao)
            VALUES (?, ?, 'entrada', 'compra', ?, ?)
            """,
            (produto_id, lote_id, quantidade, observacao),
        )
        conn.commit()
    finally:
        conn.close()


def registrar_saida(produto_id, quantidade, motivo, observacao=None):
    if quantidade <= 0:
        raise ValueError("Quantidade deve ser maior que zero.")
    if motivo not in MOTIVOS_SAIDA:
        raise ValueError("Motivo inválido.")

    conn = conectar()
    try:
        disponivel = _quantidade_atual(conn, produto_id)
        if quantidade > disponivel:
            raise EstoqueInsuficienteError(
                f"Estoque insuficiente: disponível {disponivel}, solicitado {quantidade}."
            )

        lotes = conn.execute(
            """
            SELECT id, quantidade FROM lotes
            WHERE produto_id = ? AND quantidade > 0
            ORDER BY (data_validade IS NULL), data_validade ASC, data_entrada ASC
            """,
            (produto_id,),
        ).fetchall()

        restante = quantidade
        for lote in lotes:
            if restante <= 0:
                break
            abatido = min(lote["quantidade"], restante)
            conn.execute(
                "UPDATE lotes SET quantidade = quantidade - ? WHERE id = ?",
                (abatido, lote["id"]),
            )
            conn.execute(
                """
                INSERT INTO movimentacoes (produto_id, lote_id, tipo, motivo, quantidade, observacao)
                VALUES (?, ?, 'saida', ?, ?, ?)
                """,
                (produto_id, lote["id"], motivo, abatido, observacao),
            )
            restante -= abatido

        conn.commit()
    finally:
        conn.close()


def listar_movimentacoes(produto_id=None, tipo=None, data_inicio=None, data_fim=None):
    conn = conectar()
    try:
        sql = """
            SELECT m.*, p.nome AS produto_nome
            FROM movimentacoes m
            JOIN produtos p ON p.id = m.produto_id
        """
        condicoes = []
        parametros = []

        if produto_id:
            condicoes.append("m.produto_id = ?")
            parametros.append(produto_id)
        if tipo:
            condicoes.append("m.tipo = ?")
            parametros.append(tipo)
        if data_inicio:
            condicoes.append("date(m.data) >= date(?)")
            parametros.append(data_inicio)
        if data_fim:
            condicoes.append("date(m.data) <= date(?)")
            parametros.append(data_fim)

        if condicoes:
            sql += " WHERE " + " AND ".join(condicoes)
        sql += " ORDER BY m.data DESC, m.id DESC"

        return [dict(row) for row in conn.execute(sql, parametros).fetchall()]
    finally:
        conn.close()


# ------------------------------------------------------------------ alertas --

def listar_estoque_baixo():
    produtos = listar_produtos()
    return [p for p in produtos if p["quantidade_atual"] <= p["estoque_minimo"]]


def listar_lotes_vencendo(dias=DIAS_ALERTA_VALIDADE):
    conn = conectar()
    try:
        limite = (date.today() + timedelta(days=dias)).isoformat()
        sql = """
            SELECT l.id, l.quantidade, l.data_validade, p.id AS produto_id, p.nome AS produto_nome
            FROM lotes l
            JOIN produtos p ON p.id = l.produto_id
            WHERE l.quantidade > 0 AND l.data_validade IS NOT NULL AND l.data_validade <= ?
            ORDER BY l.data_validade ASC
        """
        return [dict(row) for row in conn.execute(sql, (limite,)).fetchall()]
    finally:
        conn.close()


def valor_total_estoque():
    produtos = listar_produtos()
    total_custo = sum(p["quantidade_atual"] * p["preco_custo"] for p in produtos)
    total_venda = sum(p["quantidade_atual"] * p["preco_venda"] for p in produtos)
    return {"custo": total_custo, "venda": total_venda}


def contar_produtos_ativos():
    conn = conectar()
    try:
        row = conn.execute("SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1").fetchone()
        return row["total"]
    finally:
        conn.close()
