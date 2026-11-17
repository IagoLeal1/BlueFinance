import SwiftUI
import UIKit

/// Dinheiro como no site: "R$ 1.234,56", gasto "− R$ 32,90" (sinal de menos tipográfico), cards pequenos "R$ 9.350".
enum Dinheiro {
    static let menos = "\u{2212} "

    static func brl(_ centavos: Int) -> String {
        let absoluto = abs(centavos)
        return "\(centavos < 0 ? menos : "")R$ \(milhar(absoluto / 100)),\(String(format: "%02d", absoluto % 100))"
    }

    static func gasto(_ centavos: Int) -> String { menos + brl(centavos) }

    static func reais(_ centavos: Int) -> String {
        let reais = Int((Double(abs(centavos)) / 100).rounded())
        return "\(centavos < 0 && reais > 0 ? menos : "")R$ \(milhar(reais))"
    }

    private static func milhar(_ n: Int) -> String {
        var saida = ""
        for (i, c) in String(n).reversed().enumerated() {
            if i > 0 && i % 3 == 0 { saida.append(".") }
            saida.append(c)
        }
        return String(saida.reversed())
    }
}

/// Datas curtas: "2026-12-05" → "5 dez"; "2026-11" → "novembro".
enum Datas {
    private static let mesesCurtos = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    private static let meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

    static func diaCurto(_ dia: String) -> String {
        let partes = dia.split(separator: "-").compactMap { Int($0) }
        guard partes.count == 3, (1...12).contains(partes[1]) else { return dia }
        return "\(partes[2]) \(mesesCurtos[partes[1] - 1])"
    }

    static func dia(_ dia: String) -> Int { Int(dia.split(separator: "-").last ?? "") ?? 0 }

    static func nomeDoMes(_ mes: String) -> String {
        let partes = mes.split(separator: "-").compactMap { Int($0) }
        guard partes.count == 2, (1...12).contains(partes[1]) else { return mes }
        return meses[partes[1] - 1]
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255)
    }

    /// Uma cor para o tema claro e outra para o escuro, como os tokens do design kit.
    init(claro: UInt32, escuro: UInt32) {
        self.init(uiColor: UIColor { traco in
            let hex = traco.userInterfaceStyle == .dark ? escuro : claro
            return UIColor(red: CGFloat((hex >> 16) & 0xff) / 255, green: CGFloat((hex >> 8) & 0xff) / 255, blue: CGFloat(hex & 0xff) / 255, alpha: 1)
        })
    }
}

/// Cores e ícones do design kit (tokens.css), para as telas nativas e os widgets.
enum Visual {
    static let abismo = Color(hex: 0x0b1f4d)
    static let atum = Color(hex: 0x1846c8)
    static let agua = Color(hex: 0x3ccfc6)
    static let marca = Color(claro: 0x1846c8, escuro: 0x6e9bff)
    static let negativo = Color(claro: 0xb93e0b, escuro: 0xff9466)
    /// Valor de gasto sobre o preto da Dynamic Island.
    static let negativoNoPreto = Color(hex: 0xff9b6b)
    static let fundo = Color(claro: 0xeef4f8, escuro: 0x07101f)
    static let superficie = Color(claro: 0xffffff, escuro: 0x0f1a2e)

    static var degrade: LinearGradient {
        LinearGradient(colors: [abismo, atum], startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    /// Cor forte e de fundo de cada categoria pela ordem dela (1 a 6); as outras ficam neutras.
    private static let categorias: [(forte: (UInt32, UInt32), fundo: (UInt32, UInt32))] = [
        ((0x2a78d6, 0x3987e5), (0xe1ecf9, 0x183256)),
        ((0xdd5b25, 0xd95926), (0xfceae3, 0x3b282c)),
        ((0x009965, 0x199e70), (0xdff4ec, 0x11373d)),
        ((0xbe7500, 0xc98500), (0xfcf2db, 0x383224)),
        ((0xcc628c, 0xd55181), (0xfcedf2, 0x3b2640)),
        ((0x008300, 0x178c14), (0xdbeedb, 0x0c3124)),
    ]

    static func cor(ordem: Int) -> Color {
        guard (1...6).contains(ordem) else { return Color(claro: 0x556074, escuro: 0x9aa5b8) }
        let c = categorias[ordem - 1].forte
        return Color(claro: c.0, escuro: c.1)
    }

    static func fundo(ordem: Int) -> Color {
        guard (1...6).contains(ordem) else { return Color(claro: 0xe6ebf2, escuro: 0x1b2638) }
        let c = categorias[ordem - 1].fundo
        return Color(claro: c.0, escuro: c.1)
    }

    /// Ícones do Lucide (guardados na categoria) no equivalente do SF Symbols.
    static func simbolo(_ icone: String) -> String {
        switch icone {
        case "house": "house"
        case "shopping-cart": "cart"
        case "car": "car"
        case "utensils": "fork.knife"
        case "ticket": "ticket"
        case "heart-pulse": "heart.text.square"
        case "circle-ellipsis": "ellipsis.circle"
        case "credit-card": "creditcard"
        case "wallet-cards": "wallet.pass"
        case "briefcase": "briefcase"
        case "sparkles": "sparkles"
        case "piggy-bank": "banknote"
        default: "circle"
        }
    }
}

/// Ícone da categoria no fundo da cor dela; no preto da ilha, o tom escuro de cada categoria.
struct TileCategoria: View {
    let icone: String
    let ordem: Int
    let lado: CGFloat

    var body: some View {
        Image(systemName: Visual.simbolo(icone))
            .font(.system(size: lado * 0.45, weight: .semibold))
            .foregroundStyle(Visual.cor(ordem: ordem))
            .frame(width: lado, height: lado)
            .background(Visual.fundo(ordem: ordem), in: RoundedRectangle(cornerRadius: lado * 0.3, style: .continuous))
            .environment(\.colorScheme, .dark)
    }
}
