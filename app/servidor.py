import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from app import repositorio
from app.database import inicializar_banco
from app.exportacao import gerar_csv_movimentacoes, gerar_csv_produtos

DIR_WEB = (Path(__file__).resolve().parent / "web").resolve()


class RequisicaoHandler(BaseHTTPRequestHandler):
    def log_message(self, formato, *args):
        pass

    def do_GET(self):
        url = urlparse(self.path)
        caminho = url.path
        parametros = parse_qs(url.query)

        try:
            partes = caminho.strip("/").split("/")

            if caminho == "/api/produtos":
                incluir_inativos = parametros.get("incluir_inativos", ["0"])[0] == "1"
                busca = parametros.get("busca", [None])[0]
                self._json(repositorio.listar_produtos(incluir_inativos, busca))
            elif len(partes) == 3 and partes[:2] == ["api", "produtos"]:
                produto = repositorio.obter_produto(int(partes[2]))
                if produto is None:
                    self._json({"erro": "Produto não encontrado."}, status=404)
                else:
                    self._json(produto)
            elif caminho == "/api/movimentacoes":
                tipo = parametros.get("tipo", [None])[0]
                self._json(repositorio.listar_movimentacoes(tipo=tipo))
            elif caminho == "/api/dashboard":
                self._json(self._montar_dashboard())
            elif caminho == "/api/exportar/produtos.csv":
                self._csv(gerar_csv_produtos(), "produtos.csv")
            elif caminho == "/api/exportar/movimentacoes.csv":
                self._csv(gerar_csv_movimentacoes(), "movimentacoes.csv")
            else:
                self._arquivo_estatico(caminho)
        except Exception as erro:
            self._json({"erro": str(erro)}, status=500)

    def do_POST(self):
        caminho = urlparse(self.path).path
        try:
            corpo = self._ler_json()
            partes = caminho.strip("/").split("/")

            if caminho == "/api/produtos":
                produto_id = repositorio.criar_produto(corpo)
                self._json({"id": produto_id}, status=201)
            elif len(partes) == 4 and partes[:2] == ["api", "produtos"] and partes[3] == "status":
                repositorio.definir_produto_ativo(int(partes[2]), bool(corpo.get("ativo")))
                self._json({"ok": True})
            elif caminho == "/api/movimentacoes/entrada":
                repositorio.registrar_entrada(
                    int(corpo["produto_id"]),
                    int(corpo["quantidade"]),
                    data_validade=(corpo.get("data_validade") or None),
                    observacao=(corpo.get("observacao") or None),
                )
                self._json({"ok": True})
            elif caminho == "/api/movimentacoes/saida":
                repositorio.registrar_saida(
                    int(corpo["produto_id"]),
                    int(corpo["quantidade"]),
                    corpo["motivo"],
                    observacao=(corpo.get("observacao") or None),
                )
                self._json({"ok": True})
            else:
                self._json({"erro": "Rota não encontrada."}, status=404)
        except repositorio.EstoqueInsuficienteError as erro:
            self._json({"erro": str(erro)}, status=400)
        except (KeyError, ValueError, TypeError) as erro:
            self._json({"erro": f"Dados inválidos: {erro}"}, status=400)
        except Exception as erro:
            self._json({"erro": str(erro)}, status=500)

    def do_PUT(self):
        caminho = urlparse(self.path).path
        try:
            corpo = self._ler_json()
            partes = caminho.strip("/").split("/")

            if len(partes) == 3 and partes[:2] == ["api", "produtos"]:
                repositorio.atualizar_produto(int(partes[2]), corpo)
                self._json({"ok": True})
            else:
                self._json({"erro": "Rota não encontrada."}, status=404)
        except (KeyError, ValueError, TypeError) as erro:
            self._json({"erro": f"Dados inválidos: {erro}"}, status=400)
        except Exception as erro:
            self._json({"erro": str(erro)}, status=500)

    # ------------------------------------------------------------- helpers --

    def _montar_dashboard(self):
        return {
            "total_produtos": repositorio.contar_produtos_ativos(),
            "valores": repositorio.valor_total_estoque(),
            "estoque_baixo": repositorio.listar_estoque_baixo(),
            "vencendo": repositorio.listar_lotes_vencendo(),
        }

    def _ler_json(self):
        tamanho = int(self.headers.get("Content-Length", 0) or 0)
        if tamanho == 0:
            return {}
        dados = self.rfile.read(tamanho)
        return json.loads(dados.decode("utf-8")) if dados else {}

    def _json(self, dados, status=200):
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _csv(self, conteudo, nome_arquivo):
        corpo = conteudo.encode("utf-8-sig")
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{nome_arquivo}"')
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _arquivo_estatico(self, caminho):
        if caminho == "/":
            caminho = "/index.html"

        alvo = (DIR_WEB / caminho.lstrip("/")).resolve()
        if alvo != DIR_WEB and DIR_WEB not in alvo.parents:
            self._json({"erro": "Não encontrado."}, status=404)
            return
        if not alvo.is_file():
            self._json({"erro": "Não encontrado."}, status=404)
            return

        tipo, _ = mimetypes.guess_type(str(alvo))
        conteudo = alvo.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", tipo or "application/octet-stream")
        self.send_header("Content-Length", str(len(conteudo)))
        self.end_headers()
        self.wfile.write(conteudo)


def iniciar_servidor(porta):
    inicializar_banco()
    return ThreadingHTTPServer(("127.0.0.1", porta), RequisicaoHandler)
