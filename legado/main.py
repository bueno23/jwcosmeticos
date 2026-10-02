import webbrowser

from app.servidor import iniciar_servidor

PORTA = 8899

if __name__ == "__main__":
    servidor = iniciar_servidor(PORTA)
    url = f"http://127.0.0.1:{PORTA}/"

    print(f"JW Cosméticos Multimarcas — Controle de Estoque rodando em {url}")
    print("Deixe esta janela do terminal aberta enquanto usa o programa.")
    print("Para encerrar, feche esta janela ou pressione Ctrl+C.")

    webbrowser.open(url)

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
