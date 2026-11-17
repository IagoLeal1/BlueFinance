import SwiftUI
import UserNotifications

/// A confirmação dentro do app, no lugar da ilha (com o app aberto o iOS esconde a Live Activity do próprio app):
/// sai da Dynamic Island com uma mola, o valor rola até o número final e, em 4 segundos, recolhe e some.
struct BannerConfirmacao: View {
    let confirmacao: Confirmacao
    @Environment(Navegacao.self) private var navegacao
    @Environment(\.accessibilityReduceMotion) private var reduzirMovimento
    @State private var aberto = false
    @State private var valor = 0
    @State private var desfeito = false
    @State private var desfazendo = false

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                TileCategoria(icone: confirmacao.icone, ordem: confirmacao.ordem, lado: 40)
                    .scaleEffect(aberto ? 1 : 0.5)
                VStack(alignment: .leading, spacing: 1) {
                    Text(confirmacao.titulo).font(.subheadline.weight(.bold)).lineLimit(1).minimumScaleFactor(0.8)
                    Text(confirmacao.detalhe).font(.footnote.weight(.semibold)).foregroundStyle(Color(hex: 0x9aa3b5)).lineLimit(1)
                }
                Spacer(minLength: 4)
                Text(Dinheiro.gasto(valor))
                    .font(.system(size: 21, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .contentTransition(.numericText(value: Double(valor)))
                    .foregroundStyle(Visual.negativoNoPreto)
                    .strikethrough(desfeito)
            }
            HStack {
                if desfeito {
                    Text("Desfeito").font(.footnote.weight(.semibold)).foregroundStyle(Color(hex: 0x9aa3b5))
                } else if let sobra = confirmacao.sobraVr {
                    (Text("Sobram ") + Text(Dinheiro.brl(sobra)).bold().foregroundColor(.white) + Text(" no VR"))
                        .font(.footnote.weight(.semibold)).foregroundStyle(Color(hex: 0x9aa3b5))
                } else {
                    Text("Salvo no BlueFin").font(.footnote.weight(.semibold)).foregroundStyle(Color(hex: 0x9aa3b5))
                }
                Spacer()
                if let id = confirmacao.desfazer, !desfeito {
                    Button(desfazendo ? "Desfazendo…" : "Desfazer") { desfazer(id) }
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color(hex: 0x2c2c2e), in: Capsule())
                        .disabled(desfazendo)
                }
            }
            .opacity(aberto ? 1 : 0)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 18)
        // Em cima fica o recorte da Dynamic Island: o conteúdo começa logo abaixo dele.
        .padding(.top, aberto ? 40 : 14)
        .padding(.bottom, 14)
        .background(.black, in: RoundedRectangle(cornerRadius: aberto ? 36 : 20, style: .continuous))
        .padding(.horizontal, 10)
        // Sai de dentro da Dynamic Island: o cartão começa na altura dela, por cima da barra de status.
        .padding(.top, 11)
        .ignoresSafeArea(.container, edges: .top)
        .onTapGesture {}
        .task {
            if reduzirMovimento {
                aberto = true
                valor = confirmacao.valor
            } else {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) { aberto = true }
                try? await Task.sleep(for: .milliseconds(180))
                withAnimation(.easeOut(duration: 0.6)) { valor = confirmacao.valor }
            }
            try? await Task.sleep(for: .seconds(4))
            guard !desfazendo else { return }
            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) { navegacao.confirmacao = nil }
        }
    }

    private func desfazer(_ id: String) {
        desfazendo = true
        Task {
            try? await API.desfazer(id)
            withAnimation { desfeito = true }
            navegacao.recarregarSite += 1
            try? await Task.sleep(for: .seconds(1.5))
            withAnimation { navegacao.confirmacao = nil }
        }
    }
}

/// Aviso da fatura agendado no próprio iPhone (dentro do app o push do site não funciona): um dia antes e no dia
/// do vencimento, às 9h, como o aviso do site.
enum AvisosDaFatura {
    static func agendar() async {
        let central = UNUserNotificationCenter.current()
        guard (try? await central.requestAuthorization(options: [.alert, .sound, .badge])) == true,
              let resumo = try? await API.resumo() else { return }
        let antigos = await central.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix("fatura-") }
        central.removePendingNotificationRequests(withIdentifiers: antigos)

        var calendario = Calendar(identifier: .gregorian)
        calendario.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        for fatura in resumo.faturas where fatura.total > 0 {
            let partes = fatura.vence.split(separator: "-").compactMap { Int($0) }
            guard partes.count == 3, let vence = calendario.date(from: DateComponents(year: partes[0], month: partes[1], day: partes[2], hour: 9)) else { continue }
            for (diasAntes, texto) in [(1, "A fatura do \(fatura.cartao) vence amanhã"), (0, "Hoje vence a fatura do \(fatura.cartao)")] {
                guard let quando = calendario.date(byAdding: .day, value: -diasAntes, to: vence), quando > .now else { continue }
                let conteudo = UNMutableNotificationContent()
                conteudo.title = "BlueFin"
                conteudo.body = "\(texto): \(Dinheiro.brl(fatura.total))"
                conteudo.sound = .default
                let gatilho = UNCalendarNotificationTrigger(dateMatching: calendario.dateComponents([.year, .month, .day, .hour, .minute], from: quando), repeats: false)
                try? await central.add(UNNotificationRequest(identifier: "fatura-\(fatura.cartao)-\(fatura.vence)-\(diasAntes)", content: conteudo, trigger: gatilho))
            }
        }
    }
}
