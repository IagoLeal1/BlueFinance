import AppIntents
import WidgetKit

/// Categoria de gasto para as perguntas do iOS (lista com ícone), vinda da API e guardada no aparelho.
struct CategoriaEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Categoria"
    static var defaultQuery = CategoriaQuery()

    let id: String
    let icone: String
    let ordem: Int

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(id)", image: .init(systemName: Visual.simbolo(icone)))
    }
}

struct CategoriaQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CategoriaEntity] {
        await todas().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [CategoriaEntity] {
        await todas()
    }

    /// Da API (e guarda); sem internet, as últimas guardadas. A Fatura não é gasto do dia a dia.
    private func todas() async -> [CategoriaEntity] {
        var lista = Lembranca.categorias
        if let novas = try? await API.categorias() {
            lista = novas.filter { $0.nome != "Fatura" }
            Lembranca.categorias = lista
        }
        return lista.map { CategoriaEntity(id: $0.nome, icone: $0.icone, ordem: $0.ordem) }
    }
}

/// Lança um gasto sem abrir o app: o iOS pergunta a categoria, quanto e como pagou (e, no crédito, em quantas
/// vezes); a confirmação aparece na Dynamic Island, com Desfazer. Mesma ordem do Atalho (docs/decisoes.md).
struct LancarGastoIntent: AppIntent, LiveActivityIntent {
    static var title: LocalizedStringResource = "Lançar gasto"
    static var description = IntentDescription("Lança um gasto sem abrir o BlueFin. A confirmação aparece na Dynamic Island.")
    static var openAppWhenRun = false

    @Parameter(title: "Categoria", requestValueDialog: "Categoria")
    var categoria: CategoriaEntity

    @Parameter(title: "Quanto?", requestValueDialog: "Quanto?")
    var valor: Double

    @Parameter(title: "Como pagou?")
    var forma: String?

    @Parameter(title: "Em quantas vezes?", default: 1)
    var parcelas: Int

    func perform() async throws -> some IntentResult {
        let centavos = Int((valor * 100).rounded())
        guard centavos > 0 else { throw ErroDaAPI(mensagem: "O valor precisa ser maior que zero.") }

        // "Como pagou?": a última forma usada na categoria vem primeiro.
        let formas = (try? await API.formas(categoria: categoria.id)) ?? Lembranca.formas
        var escolhida = forma ?? ""
        if !formas.contains(escolhida) {
            escolhida = formas.count == 1 ? formas[0] : try await $forma.requestDisambiguation(among: formas, dialog: "Como pagou?")
        }
        var vezes = 1
        if escolhida.hasPrefix("Crédito") {
            vezes = min(max(try await $parcelas.requestValue("Em quantas vezes?"), 1), 24)
        }

        let resposta = try await API.lancar(categoria: categoria.id, centavos: centavos, descricao: "", forma: escolhida, parcelas: vezes)
        let rotulo = escolhida.hasPrefix("Crédito · ") && formas.filter({ $0.hasPrefix("Crédito") }).count == 1 ? "Crédito" : escolhida
        let confirmacao = Confirmacao(
            titulo: categoria.id,
            detalhe: vezes > 1 ? "\(vezes)x no \(rotulo)" : rotulo,
            valor: centavos, sobraVr: resposta.vr?.saldo,
            icone: categoria.icone, ordem: categoria.ordem, desfazer: resposta.desfazer)
        await MainActor.run { ConfirmacaoNaIlha.mostrar(confirmacao) }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
