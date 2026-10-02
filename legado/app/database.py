import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "estoque.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT,
    marca TEXT,
    codigo TEXT,
    preco_custo REAL NOT NULL DEFAULT 0,
    preco_venda REAL NOT NULL DEFAULT 0,
    estoque_minimo INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    data_validade TEXT,
    data_entrada TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    lote_id INTEGER REFERENCES lotes(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    motivo TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    data TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    observacao TEXT
);
"""


def conectar():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def inicializar_banco():
    conn = conectar()
    try:
        conn.executescript(_SCHEMA)
        conn.commit()
    finally:
        conn.close()
