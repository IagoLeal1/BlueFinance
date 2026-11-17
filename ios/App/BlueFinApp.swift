import ActivityKit
import Observation
import SwiftUI
import UIKit
import WebKit
import WidgetKit

/// O BlueFin como app nativo, um app só: as telas do site dentro do app e, por cima, as partes nativas —
/// Gasto rápido pelo Botão de Ação, confirmação na Dynamic Island e widgets (design kit: telas 29 e 30).
@main
struct BlueFinApp: App {
    @State private var navegacao = Navegacao.compartilhada
    @Environment(\.scenePhase) private var fase

    var body: some Scene {
        WindowGroup {
            Raiz()
                .environment(navegacao)
                // bluefin://gasto: o + do widget médio.
                .onOpenURL { url in
                    if url.host() == "gasto" { navegacao.gastoRapido = true }
                }
        }
        .onChange(of: fase) { _, nova in
            guard nova == .active else { return }
            Task { await AvisosDaFatura.agendar() }
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

/// O que está na tela por cima do site: o Gasto rápido e a confirmação do último gasto.
@MainActor
@Observable
final class Navegacao {
    static let compartilhada = Navegacao()

    var gastoRapido = false
    var confirmacao: Confirmacao?
    /// Muda quando um gasto entra ou é desfeito: o site recarrega para mostrar.
    var recarregarSite = 0

    private init() {
        NotificationCenter.default.addObserver(forName: .gastoDesfeito, object: nil, queue: .main) { _ in
            Task { @MainActor in Navegacao.compartilhada.recarregarSite += 1 }
        }
    }

    /// Gasto salvo: confirmação no app (que imita a ilha), na Dynamic Island (ao sair do app) e nos widgets.
    func confirmar(_ confirmacao: Confirmacao) {
        withAnimation(.spring(response: 0.45, dampingFraction: 0.72)) { self.confirmacao = confirmacao }
        recarregarSite += 1
        ConfirmacaoNaIlha.mostrar(confirmacao)
        WidgetCenter.shared.reloadAllTimelines()
    }
}

struct Raiz: View {
    @Environment(Navegacao.self) private var navegacao

    var body: some View {
        @Bindable var nav = navegacao
        ZStack(alignment: .top) {
            Visual.fundo.ignoresSafeArea()
            Site(recarregar: navegacao.recarregarSite).ignoresSafeArea()
            if let confirmacao = navegacao.confirmacao {
                BannerConfirmacao(confirmacao: confirmacao)
                    .id(confirmacao)
                    .transition(.scale(scale: 0.4, anchor: .top).combined(with: .opacity))
                    .zIndex(1)
            }
        }
        .fullScreenCover(isPresented: $nav.gastoRapido) {
            GastoRapido().environment(navegacao)
        }
    }
}

/// As telas do site (o mesmo do Safari: login, Início, Lançamentos, Investir, Ajustes), dentro do app.
struct Site: UIViewRepresentable {
    var recarregar: Int

    func makeCoordinator() -> Coordenador { Coordenador() }

    func makeUIView(context: Context) -> WKWebView {
        let configuracao = WKWebViewConfiguration()
        // Domínio do app (WKAppBoundDomains): o service worker funciona e o site abre sem internet, como no PWA.
        configuracao.limitsNavigationsToAppBoundDomains = true
        configuracao.websiteDataStore = .default()
        let web = WKWebView(frame: .zero, configuration: configuracao)
        web.allowsBackForwardNavigationGestures = true
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        // O site já cuida das áreas seguras (viewport-fit=cover), como no app da Tela de Início.
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.load(URLRequest(url: Config.site))
        context.coordinator.ultimo = recarregar
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        guard context.coordinator.ultimo != recarregar else { return }
        context.coordinator.ultimo = recarregar
        web.reload()
    }

    final class Coordenador {
        var ultimo = 0
    }
}

/// A Live Activity da confirmação: aparece na Dynamic Island quando você sai do app (com o app aberto, o iOS
/// não mostra a ilha do próprio app — por isso a confirmação também aparece dentro dele) e na Tela Bloqueada.
@MainActor
enum ConfirmacaoNaIlha {
    static func mostrar(_ confirmacao: Confirmacao) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        Task {
            for antiga in Activity<ConfirmacaoAtributos>.activities {
                await antiga.end(nil, dismissalPolicy: .immediate)
            }
            let conteudo = ActivityContent(state: confirmacao, staleDate: .now + 60)
            guard let atividade = try? Activity.request(attributes: ConfirmacaoAtributos(), content: conteudo) else { return }
            // Fora da tela, o app ganha alguns segundos para a ilha mostrar o gasto e depois sumir.
            let tarefa = UIApplication.shared.beginBackgroundTask(withName: "confirmacao") {}
            try? await Task.sleep(for: .seconds(8))
            await atividade.end(ActivityContent(state: atividade.content.state, staleDate: nil), dismissalPolicy: .immediate)
            UIApplication.shared.endBackgroundTask(tarefa)
        }
    }
}
