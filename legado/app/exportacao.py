import csv
import io

from app.repositorio import listar_movimentacoes, listar_produtos


def gerar_csv_produtos():
    produtos = listar_produtos(incluir_inativos=True)
    campos = [
        "id", "nome", "categoria", "marca", "codigo",
        "preco_custo", "preco_venda", "estoque_minimo", "quantidade_atual", "ativo",
    ]
    saida = io.StringIO()
    escritor = csv.DictWriter(saida, fieldnames=campos, delimiter=";")
    escritor.writeheader()
    for produto in produtos:
        escritor.writerow({campo: produto.get(campo) for campo in campos})
    return saida.getvalue()


def gerar_csv_movimentacoes():
    movimentacoes = listar_movimentacoes()
    campos = ["id", "data", "produto_nome", "tipo", "motivo", "quantidade", "observacao"]
    saida = io.StringIO()
    escritor = csv.DictWriter(saida, fieldnames=campos, delimiter=";")
    escritor.writeheader()
    for mov in movimentacoes:
        escritor.writerow({campo: mov.get(campo) for campo in campos})
    return saida.getvalue()
