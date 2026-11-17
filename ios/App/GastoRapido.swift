import AppIntents
import SwiftUI

/// Botão de Ação → o BlueFin abre direto no Gasto rápido, sem o Atalho (design kit: TelaGastoRapidoNativo).
struct GastoRapidoIntent: AppIntent {
    static var title: LocalizedStringResource = "Gasto rápido"
    static var description = IntentDescription("Abre o BlueFin no teclado do Gasto rápido.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        Navegacao.compartilhada.gastoRapido = true
        return .result()
    }
}

/// Aparece sozinho no app Atalhos e em Ajustes › Botão de Ação › Atalho.
struct AtalhosDoBlueFin: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: GastoRapidoIntent(),
            phrases: ["Gasto rápido no \(.applicationName)", "Lançar gasto no \(.applicationName)"],
            shortTitle: "Gasto rápido",
            systemImageName: "plus.circle")
    }
}

/// Guarda no aparelho o que abre o Gasto rápido na hora: categorias, formas e as últimas escolhas.
enum Lembranca {
    private static let padrao = UserDefaults.standard

    static var categorias: [CategoriaApp] {
        get { (padrao.data(forKey: "categorias")).flatMap { try? JSONDecoder().decode([CategoriaApp].self, from: $0) } ?? [] }
        set { padrao.set(try? JSONEncoder().encode(newValue), forKey: "categorias") }
    }

    static var formas: [String] {
        get { padrao.stringArray(forKey: "formas") ?? ["Débito", "Pix"] }
        set { padrao.set(newValue, forKey: "formas") }
    }

    static var ultimaCategoria: String? {
        get { padrao.string(forKey: "ultimaCategoria") }
        set { padrao.set(newValue, forKey: "ultimaCategoria") }
    }
}

struct GastoRapido: View {
    @Environment(\.dismiss) private var fechar
    @Environment(Navegacao.self) private var navegacao

    @State private var centavos = 0
    @State private var categorias = Lembranca.categorias
    @State private var categoria = Lembranca.ultimaCategoria
    @State private var formas = Lembranca.formas
    @State private var forma = Lembranca.formas.first ?? "Débito"
    /// Você tocou na forma: a lista que chega da internet não muda mais a escolha.
    @State private var formaTocada = false
    @State private var parcelas = 1
    @State private var descricao = ""
    @State private var salvando = false
    @State private var erro: String?
    @State private var toques = 0

    private let colunas = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)
    private var noCredito: Bool { forma.hasPrefix("Crédito") }
    private var podeSalvar: Bool { centavos > 0 && categoria != nil && !salvando }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Gasto rápido").font(.title2.bold())
                Spacer()
                Button { fechar() } label: {
                    Image(systemName: "xmark").font(.body.weight(.bold)).foregroundStyle(.primary)
                        .frame(width: 40, height: 40).background(Visual.superficie, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Fechar")
            }

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("R$").font(.title2.weight(.bold)).foregroundStyle(.secondary)
                Text(Dinheiro.brl(centavos).replacingOccurrences(of: "R$ ", with: ""))
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .contentTransition(.numericText(value: Double(centavos)))
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Valor")

            LazyVGrid(columns: colunas, spacing: 8) {
                ForEach(categorias) { c in
                    BotaoCategoria(categoria: c, marcada: c.nome == categoria) { escolher(c.nome) }
                }
            }

            Picker("Como pagou", selection: Binding(get: { forma }, set: { forma = $0; formaTocada = true })) {
                ForEach(formasEmOrdem, id: \.self) { f in Text(rotulo(f)).tag(f) }
            }
            .pickerStyle(.segmented)

            if noCredito {
                Stepper(value: $parcelas, in: 1...24) {
                    Text(parcelas == 1 ? "À vista" : "\(parcelas)x de \(Dinheiro.brl(centavos / parcelas))").font(.subheadline.weight(.semibold))
                }
            }

            TextField("Com o quê (opcional)", text: $descricao)
                .padding(12)
                .background(Visual.superficie, in: RoundedRectangle(cornerRadius: 12))

            Teclado { tecla in
                toques += 1
                switch tecla {
                case "⌫": centavos /= 10
                case "00": centavos = min(centavos * 100, 99_999_999_999)
                default: centavos = min(centavos * 10 + (Int(tecla) ?? 0), 99_999_999_999)
                }
            }
            .sensoryFeedback(.impact(weight: .light), trigger: toques)

            if let erro {
                Text(erro).font(.footnote.weight(.semibold)).foregroundStyle(Visual.negativo).frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(action: salvar) {
                Label(salvando ? "Salvando…" : "Salvar · \(Dinheiro.gasto(centavos))", systemImage: "checkmark")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(Visual.marca)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .disabled(!podeSalvar)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Visual.fundo.ignoresSafeArea())
        .animation(.snappy, value: noCredito)
        .task { await atualizar() }
    }

    /// Ordem fixa na barra: Débito, Pix, Crédito, VR (a última usada já vem marcada).
    private var formasEmOrdem: [String] {
        let peso: (String) -> Int = { f in f == "Débito" ? 0 : f == "Pix" ? 1 : f.hasPrefix("Crédito") ? 2 : 3 }
        return formas.sorted { peso($0) < peso($1) }
    }

    /// "Crédito · C6bank" vira "Crédito" quando só há um cartão; com mais de um, fica o nome do cartão.
    private func rotulo(_ f: String) -> String {
        guard f.hasPrefix("Crédito · ") else { return f }
        return formas.filter { $0.hasPrefix("Crédito") }.count == 1 ? "Crédito" : String(f.dropFirst("Crédito · ".count))
    }

    private func escolher(_ nome: String) {
        categoria = nome
        formaTocada = false
        Task { await carregarFormas(nome) }
    }

    /// Atualiza categorias e formas por trás; a tela já abriu com o que estava guardado.
    private func atualizar() async {
        if let novas = try? await API.categorias() {
            categorias = novas.filter { $0.nome != "Fatura" }
            Lembranca.categorias = categorias
            if categoria == nil || !categorias.contains(where: { $0.nome == categoria }) { categoria = categorias.first?.nome }
        }
        if let categoria { await carregarFormas(categoria) }
    }

    private func carregarFormas(_ nome: String) async {
        guard let lista = try? await API.formas(categoria: nome), !lista.isEmpty else { return }
        formas = lista
        Lembranca.formas = lista
        if !formaTocada || !lista.contains(forma) { forma = lista[0] }
    }

    private func salvar() {
        guard let categoria, centavos > 0 else { return }
        salvando = true
        erro = nil
        Task {
            do {
                let resposta = try await API.lancar(
                    categoria: categoria, centavos: centavos, descricao: descricao, forma: forma, parcelas: noCredito ? parcelas : 1)
                Lembranca.ultimaCategoria = categoria
                let c = categorias.first { $0.nome == categoria }
                let semDescricao = descricao.trimmingCharacters(in: .whitespaces).isEmpty
                let comoPagou = noCredito && parcelas > 1 ? "\(parcelas)x no \(rotulo(forma))" : rotulo(forma)
                navegacao.confirmar(Confirmacao(
                    titulo: semDescricao ? categoria : descricao,
                    detalhe: semDescricao ? comoPagou : "\(categoria) · \(comoPagou)",
                    valor: centavos, sobraVr: resposta.vr?.saldo,
                    icone: c?.icone ?? "circle", ordem: c?.ordem ?? 0, desfazer: resposta.desfazer))
                fechar()
            } catch {
                erro = error.localizedDescription
                salvando = false
            }
        }
    }
}

private struct BotaoCategoria: View {
    let categoria: CategoriaApp
    let marcada: Bool
    let tocar: () -> Void

    var body: some View {
        Button(action: tocar) {
            VStack(spacing: 4) {
                Image(systemName: Visual.simbolo(categoria.icone))
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Visual.cor(ordem: categoria.ordem))
                    .frame(width: 34, height: 34)
                    .background(Visual.fundo(ordem: categoria.ordem), in: RoundedRectangle(cornerRadius: 10))
                Text(categoria.nome).font(.caption.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(Visual.superficie, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(marcada ? Visual.marca : .clear, lineWidth: 2))
            .scaleEffect(marcada ? 1.03 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: marcada)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(marcada ? .isSelected : [])
    }
}

/// Teclado numérico do app: o dígito entra pela direita, como na maquininha.
private struct Teclado: View {
    let tocar: (String) -> Void
    private let teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 3), spacing: 6) {
            ForEach(teclas, id: \.self) { tecla in
                Button { tocar(tecla) } label: {
                    Group {
                        if tecla == "⌫" { Image(systemName: "delete.left") } else { Text(tecla) }
                    }
                    .font(.title3.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Visual.superficie, in: RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tecla == "⌫" ? "Apagar" : tecla)
            }
        }
    }
}
