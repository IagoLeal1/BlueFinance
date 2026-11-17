import Foundation

/// Endereço do BlueFin e o token pessoal (o mesmo do Atalho), que entra no app na hora de compilar,
/// vindo de ios/Segredos.xcconfig. O app e os widgets falam com a mesma API do site.
enum Config {
    static let site = URL(string: "https://bluefinance-chi.vercel.app")!

    static var token: String {
        let valor = (Bundle.main.object(forInfoDictionaryKey: "BlueFinToken") as? String) ?? ""
        return valor.hasPrefix("bf_") ? valor : ""
    }
}

/// Categoria de gasto, na ordem do app (a ordem 1 a 6 dá a cor, a mesma do site).
struct CategoriaApp: Codable, Hashable, Identifiable {
    let nome: String
    let icone: String
    let ordem: Int
    var id: String { nome }
}

struct RespostaGasto: Decodable {
    let mensagem: String
    /// Id para o "Desfazer": o lançamento ou, no crédito, a compra com as parcelas.
    let desfazer: String?
    let vr: SaldoVr?

    struct SaldoVr: Decodable {
        let saldo: Int
    }
}

/// GET /api/resumo: o mês como no Início, a próxima fatura de cada cartão e o VR. Valores em centavos.
struct Resumo: Codable {
    let mes: String
    let entrou: Int
    let saiu: Int
    let investiu: Int
    let sobrou: Int
    let aPagar: Int
    let faturas: [Fatura]
    let vr: Vr?

    struct Fatura: Codable {
        let cartao: String
        let mes: String
        let total: Int
        /// "2026-12-11".
        let vence: String
    }

    struct Vr: Codable {
        let saldo: Int
        let valorMensal: Int
        let proximo: String
    }

    /// Para a galeria de widgets e o primeiro desenho, antes de os dados chegarem.
    static let exemplo = Resumo(
        mes: "2026-11", entrou: 935000, saiu: 363200, investiu: 150000, sobrou: 421835, aPagar: 0,
        faturas: [Fatura(cartao: "C6bank", mes: "2026-12", total: 123456, vence: "2026-12-11")],
        vr: Vr(saldo: 37940, valorMensal: 90000, proximo: "2026-12-05"))
}

struct ErroDaAPI: LocalizedError {
    let mensagem: String
    var errorDescription: String? { mensagem }
}

/// A API do BlueFin com o token pessoal (Authorization: Bearer bf_…), igual ao Atalho.
enum API {
    private static func pedido(_ caminho: String, query: [URLQueryItem] = [], metodo: String = "GET", corpo: [String: Any]? = nil) async throws -> Data {
        guard !Config.token.isEmpty else {
            throw ErroDaAPI(mensagem: "Falta o token do Atalho no app (ios/Segredos.xcconfig).")
        }
        var componentes = URLComponents(url: Config.site, resolvingAgainstBaseURL: false)!
        componentes.path = caminho
        if !query.isEmpty { componentes.queryItems = query }
        var requisicao = URLRequest(url: componentes.url!)
        requisicao.httpMethod = metodo
        requisicao.timeoutInterval = 20
        requisicao.setValue("Bearer \(Config.token)", forHTTPHeaderField: "Authorization")
        if let corpo {
            requisicao.setValue("application/json", forHTTPHeaderField: "Content-Type")
            requisicao.httpBody = try JSONSerialization.data(withJSONObject: corpo)
        }
        let (dados, resposta) = try await URLSession.shared.data(for: requisicao)
        let status = (resposta as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            // Toda resposta de erro da API traz "mensagem" em português.
            let mensagem = (try? JSONDecoder().decode([String: String].self, from: dados))?["mensagem"]
            throw ErroDaAPI(mensagem: mensagem ?? "Não deu para falar com o BlueFin (\(status)).")
        }
        return dados
    }

    static func categorias() async throws -> [CategoriaApp] {
        struct Corpo: Decodable { let itens: [CategoriaApp] }
        let dados = try await pedido("/api/quick-add/categorias")
        return try JSONDecoder().decode(Corpo.self, from: dados).itens
    }

    /// "Como pagou?": a última forma usada na categoria vem primeiro.
    static func formas(categoria: String) async throws -> [String] {
        struct Corpo: Decodable { let formas: [String] }
        let dados = try await pedido("/api/quick-add/formas", query: [URLQueryItem(name: "categoria", value: categoria)])
        return try JSONDecoder().decode(Corpo.self, from: dados).formas
    }

    static func lancar(categoria: String, centavos: Int, descricao: String, forma: String, parcelas: Int) async throws -> RespostaGasto {
        let corpo: [String: Any] = [
            "categoria": categoria, "valor_centavos": centavos, "descricao": descricao, "forma": forma, "parcelas": String(parcelas),
        ]
        let dados = try await pedido("/api/quick-add", metodo: "POST", corpo: corpo)
        return try JSONDecoder().decode(RespostaGasto.self, from: dados)
    }

    static func desfazer(_ id: String) async throws {
        _ = try await pedido("/api/quick-add/desfazer", metodo: "POST", corpo: ["desfazer": id])
    }

    static func resumo() async throws -> Resumo {
        let dados = try await pedido("/api/resumo")
        return try JSONDecoder().decode(Resumo.self, from: dados)
    }
}
