import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct WidgetsDoBlueFin: WidgetBundle {
    var body: some Widget {
        ResumoWidget()
        VrWidget()
        FaturaWidget()
        ConfirmacaoNaIlhaWidget()
    }
}

// MARK: - Dados

/// "Esconder valores" na edição do widget: o olhinho do site não chega aqui, então cada widget tem o seu.
struct ConfigResumo: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Resumo do BlueFin"
    static var description = IntentDescription("Sobrou, Saiu, a fatura a pagar e o VR.")

    @Parameter(title: "Esconder valores", default: false)
    var esconder: Bool
}

struct EntradaResumo: TimelineEntry {
    let date: Date
    let resumo: Resumo?
    var esconder = false
}

/// Busca o resumo na API; o app pede para atualizar a cada gasto salvo e o iOS atualiza algumas vezes por dia.
struct ProvedorResumo: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> EntradaResumo { EntradaResumo(date: .now, resumo: .exemplo) }

    func snapshot(for configuration: ConfigResumo, in context: Context) async -> EntradaResumo {
        let resumo = context.isPreview ? .exemplo : (try? await API.resumo()) ?? .exemplo
        return EntradaResumo(date: .now, resumo: resumo, esconder: configuration.esconder)
    }

    func timeline(for configuration: ConfigResumo, in context: Context) async -> Timeline<EntradaResumo> {
        let entrada = EntradaResumo(date: .now, resumo: try? await API.resumo(), esconder: configuration.esconder)
        return Timeline(entries: [entrada], policy: .after(.now + 30 * 60))
    }
}

struct ProvedorSimples: TimelineProvider {
    func placeholder(in context: Context) -> EntradaResumo { EntradaResumo(date: .now, resumo: .exemplo) }

    func getSnapshot(in context: Context, completion: @escaping (EntradaResumo) -> Void) {
        Task { completion(EntradaResumo(date: .now, resumo: context.isPreview ? .exemplo : (try? await API.resumo()) ?? .exemplo)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<EntradaResumo>) -> Void) {
        Task {
            let entrada = EntradaResumo(date: .now, resumo: try? await API.resumo())
            completion(Timeline(entries: [entrada], policy: .after(.now + 30 * 60)))
        }
    }
}

private let mascara = "R$ ••••"

// MARK: - Tela de Início (design kit: TelaWidgets)

struct ResumoWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "resumo", intent: ConfigResumo.self, provider: ProvedorResumo()) { entrada in
            ResumoView(entrada: entrada).containerBackground(Visual.degrade, for: .widget)
        }
        .configurationDisplayName("Resumo do mês")
        .description("Sobrou, Saiu, a fatura a pagar e o VR.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ResumoView: View {
    let entrada: EntradaResumo
    @Environment(\.widgetFamily) private var familia

    var body: some View {
        Group {
            if let r = entrada.resumo {
                if familia == .systemSmall { pequeno(r) } else { medio(r) }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text("BlueFin").font(.headline)
                    Text("Abra o app para atualizar.").font(.caption).opacity(0.8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .foregroundStyle(.white)
    }

    private func valor(_ texto: String) -> String { entrada.esconder ? mascara : texto }

    private func pequeno(_ r: Resumo) -> some View {
        VStack(alignment: .leading) {
            Text("Sobrou em \(Datas.nomeDoMes(r.mes))").font(.caption.weight(.semibold)).opacity(0.8)
            Spacer()
            Text(valor(Dinheiro.reais(r.sobrou))).font(.system(size: 24, weight: .heavy, design: .rounded)).monospacedDigit().minimumScaleFactor(0.6)
            Spacer()
            if let vr = r.vr {
                (Text("VR ").foregroundColor(.white.opacity(0.8)) + Text(valor(Dinheiro.reais(vr.saldo))).bold()).font(.caption.weight(.semibold))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func medio(_ r: Resumo) -> some View {
        VStack(alignment: .leading) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Sobrou em \(Datas.nomeDoMes(r.mes))").font(.caption.weight(.semibold)).opacity(0.8)
                    Text(valor(Dinheiro.brl(r.sobrou))).font(.system(size: 28, weight: .heavy, design: .rounded)).monospacedDigit().minimumScaleFactor(0.6)
                }
                Spacer()
                // O + abre o Gasto rápido.
                Link(destination: URL(string: "bluefin://gasto")!) {
                    Image(systemName: "plus").font(.body.weight(.bold))
                        .frame(width: 40, height: 40)
                        .background(.white.opacity(0.18), in: Circle())
                        .overlay(Circle().stroke(Visual.agua, lineWidth: 3))
                }
                .accessibilityLabel("Gasto rápido")
            }
            Spacer()
            HStack(alignment: .bottom) {
                coluna("Saiu", valor(Dinheiro.reais(r.saiu)))
                if let f = r.faturas.first {
                    coluna("Fatura \(f.cartao) · dia \(Datas.dia(f.vence))", valor(Dinheiro.reais(f.total)))
                }
                if let vr = r.vr { coluna("VR", valor(Dinheiro.reais(vr.saldo))) }
            }
        }
    }

    private func coluna(_ rotulo: String, _ texto: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(rotulo).font(.caption2.weight(.semibold)).opacity(0.8).lineLimit(1)
            Text(texto).font(.subheadline.weight(.bold)).monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Tela Bloqueada

struct VrWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "vr", provider: ProvedorSimples()) { entrada in
            VStack(alignment: .leading, spacing: 0) {
                Label("VR", systemImage: "wallet.pass").font(.caption.weight(.semibold))
                Text(entrada.resumo?.vr.map { Dinheiro.brl($0.saldo) } ?? "—").font(.title3.weight(.heavy)).monospacedDigit()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("VR")
        .description("O saldo do vale-refeição.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct FaturaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "fatura", provider: ProvedorSimples()) { entrada in
            let fatura = entrada.resumo?.faturas.first
            VStack(alignment: .leading, spacing: 0) {
                Label("Fatura \(fatura?.cartao ?? "")", systemImage: "creditcard").font(.caption.weight(.semibold))
                Text(fatura.map { "\(Dinheiro.reais($0.total)) · dia \(Datas.dia($0.vence))" } ?? "—").font(.headline.weight(.heavy)).monospacedDigit()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Fatura")
        .description("A fatura a pagar e o dia em que vence.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Dynamic Island e Tela Bloqueada (design kit: TelaGastoRapidoNativo)

struct ConfirmacaoNaIlhaWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ConfirmacaoAtributos.self) { contexto in
            CartaoConfirmacao(estado: contexto.state)
                .padding(16)
                .activityBackgroundTint(Color(hex: 0x141824).opacity(0.85))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { contexto in
            let estado = contexto.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    TileCategoria(icone: estado.icone, ordem: estado.ordem, lado: 40)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(estado.titulo).font(.subheadline.weight(.bold)).lineLimit(1)
                        Text(estado.detalhe).font(.footnote.weight(.semibold)).foregroundStyle(Color(hex: 0x9aa3b5)).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ValorGasto(estado: estado, tamanho: 20)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    RodapeConfirmacao(estado: estado)
                }
            } compactLeading: {
                TileCategoria(icone: estado.icone, ordem: estado.ordem, lado: 24)
            } compactTrailing: {
                ValorGasto(estado: estado, tamanho: 14)
            } minimal: {
                Image(systemName: Visual.simbolo(estado.icone)).foregroundStyle(Visual.negativoNoPreto)
            }
        }
    }
}

private struct ValorGasto: View {
    let estado: Confirmacao
    let tamanho: CGFloat

    var body: some View {
        Text(Dinheiro.gasto(estado.valor))
            .font(.system(size: tamanho, weight: .heavy, design: .rounded))
            .monospacedDigit()
            .contentTransition(.numericText(value: Double(estado.valor)))
            .foregroundStyle(Visual.negativoNoPreto)
            .strikethrough(estado.desfeito)
    }
}

private struct RodapeConfirmacao: View {
    let estado: Confirmacao

    var body: some View {
        HStack {
            if estado.desfeito {
                Text("Desfeito")
            } else if let sobra = estado.sobraVr {
                Text("Sobram ") + Text(Dinheiro.brl(sobra)).bold().foregroundColor(.white) + Text(" no VR")
            } else {
                Text("Salvo no BlueFin")
            }
            Spacer()
            if let id = estado.desfazer, !estado.desfeito {
                Button(intent: DesfazerGastoIntent(id: id)) {
                    Text("Desfazer").font(.footnote.weight(.bold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color(hex: 0x2c2c2e), in: Capsule())
            }
        }
        .font(.footnote.weight(.semibold))
        .foregroundStyle(Color(hex: 0x9aa3b5))
    }
}

/// A mesma confirmação na Tela Bloqueada.
private struct CartaoConfirmacao: View {
    let estado: Confirmacao

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                TileCategoria(icone: estado.icone, ordem: estado.ordem, lado: 40)
                VStack(alignment: .leading, spacing: 1) {
                    Text(estado.titulo).font(.subheadline.weight(.bold)).foregroundStyle(.white)
                    Text(estado.detalhe).font(.footnote.weight(.semibold)).foregroundStyle(Color(hex: 0x9aa3b5))
                }
                Spacer()
                ValorGasto(estado: estado, tamanho: 22)
            }
            RodapeConfirmacao(estado: estado)
        }
    }
}
