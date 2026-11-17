import ActivityKit
import AppIntents
import Foundation

/// A confirmação do gasto salvo na Dynamic Island e na Tela Bloqueada (design kit: TelaGastoRapidoNativo).
/// É uma Live Activity iniciada pelo próprio app, sem push (a conta gratuita da Apple não tem push).
struct ConfirmacaoAtributos: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// "Almoço" (o "com o quê", ou a categoria).
        var titulo: String
        /// "Alimentação · VR".
        var detalhe: String
        /// Centavos.
        var valor: Int
        /// No VR: quanto sobra nele.
        var sobraVr: Int?
        var icone: String
        var ordem: Int
        /// Id para o "Desfazer" (POST /api/quick-add/desfazer).
        var desfazer: String?
        var desfeito = false
    }
}

typealias Confirmacao = ConfirmacaoAtributos.ContentState

/// "Desfazer" da Dynamic Island: roda dentro do app, apaga o gasto e encerra a confirmação.
struct DesfazerGastoIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Desfazer gasto"
    static var isDiscoverable = false

    @Parameter(title: "Lançamento")
    var id: String

    init() {}

    init(id: String) {
        self.id = id
    }

    func perform() async throws -> some IntentResult {
        try await API.desfazer(id)
        for atividade in Activity<ConfirmacaoAtributos>.activities where atividade.content.state.desfazer == id {
            var estado = atividade.content.state
            estado.desfeito = true
            await atividade.end(ActivityContent(state: estado, staleDate: nil), dismissalPolicy: .after(.now + 3))
        }
        NotificationCenter.default.post(name: .gastoDesfeito, object: id)
        return .result()
    }
}

extension Notification.Name {
    /// O site recarrega para tirar o gasto desfeito da lista.
    static let gastoDesfeito = Notification.Name("bluefin.gastoDesfeito")
}
