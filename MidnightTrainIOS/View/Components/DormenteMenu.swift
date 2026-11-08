//
//  DormenteMenu.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//
import SwiftUI

struct DormenteMenu: View {
    let dormentes: [Dormente]

    //@State private var dormentes: [Dormente] = []
    //@State private var selecionado: Dormente?

    var body: some View {
        VStack(spacing: 0) {
            ForEach(dormentes) { dormente in
                NavigationLink {
                    EachDormenteView(dormente: dormente)
                } label: {
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(dormente.nome)
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(.primary)

                            Text("Lote \(dormente.lote) – Setor \(dormente.setor)")
                                .font(.system(size: 16))
                                .foregroundStyle(.secondary)
                        }

                        Spacer(minLength: 8)

                        Text(dormente.status.rawValue)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(cor(dormente.status))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                cor(dormente.status).opacity(0.18),
                                in: RoundedRectangle(cornerRadius: 10)
                            )

                        Image(systemName: "chevron.right")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.primary)
                            .frame(width: 36, height: 36)
                            .background(.white.opacity(0.65), in: Circle())
                    }
                    .padding(.horizontal, 16)
                    .frame(minHeight: 88)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if dormente.id != dormentes.last?.id {
                    Divider()
                        .padding(.horizontal, 16)
                }
            }
        }

        //        .task {
        //            do {
        //                dormentes = try await DormenteService().listar()
        //            } catch {
        //                mensagemErro = error.localizedDescription
        //            }
        //        }

        .background(
            Color(uiColor: .secondarySystemGroupedBackground),
            in: RoundedRectangle(cornerRadius: 24)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 24)
                .stroke(.white.opacity(0.8), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.12), radius: 16, y: 8)

        //        .sheet(item: $selecionado) { dormente in
        //            VStack(spacing: 12) {
        //                Text(dormente.nome)
        //                    .font(.title)
        //
        //                Text("Lote \(dormente.lote) – Setor \(dormente.setor)")
        //                Text(dormente.status.rawValue)
        //
        //                Button("Fechar") {
        //                    selecionado = nil
        //                }
        //            }
        //            .padding()
        //            .presentationDetents([.medium])
        //        }
    }

    private func cor(_ status: Status) -> Color {
        switch status {
        case .pending: .orange
        case .approved: .green
        case .refused: .red
        }
    }
}

#Preview {
    NavigationStack {
        DormenteMenu(dormentes: Dormente.exemplos)
            .padding()
    }
}
//
//struct DormenteMenu: View {
//    @State private var dormentes = Dormente.exemplos
//    @State private var selecionado: Dormente?
//    @State private var mensagemErro: String?
//
//    var body: some View {
//        ScrollView {
//            VStack(spacing: 0) {
//                ForEach(dormentes) { dormente in
//                    Button {
//                        selecionado = dormente
//                    } label: {
//                        HStack {
//                            VStack(alignment: .leading, spacing: 4) {
//                                Text(dormente.nome)
//                                    .font(.headline)
//                                    .foregroundStyle(.primary)
//
//                                Text("Lote \(dormente.lote) – Setor \(dormente.setor)")
//                                    .foregroundStyle(.secondary)
//                            }
//
//                            Spacer()
//
//                            Text(dormente.status.rawValue)
//                                .padding(.horizontal, 12)
//                                .padding(.vertical, 8)
//                                .background(
//                                    cor(dormente.status).opacity(0.2),
//                                    in: RoundedRectangle(cornerRadius: 10)
//                                )
//                                .foregroundStyle(cor(dormente.status))
//
//                            Image(systemName: "chevron.right")
//                                .foregroundStyle(.primary)
//                                .padding(.leading, 8)
//                        }
//                        .padding()
//                        .contentShape(Rectangle())
//                    }
//                    .buttonStyle(.plain)
//
//                    Divider()
//                        .padding(.horizontal)
//                }
//            }
//        }
////        .task {
////            do {
////                dormentes = try await DormenteService().listar()
////            } catch {
////                mensagemErro = error.localizedDescription
////            }
////        }
//        .alert("Não foi possível carregar os dormentes",
//               isPresented: Binding(
//                   get: { mensagemErro != nil },
//                   set: { if !$0 { mensagemErro = nil } }
//               )) {
//            Button("OK") { mensagemErro = nil }
//        } message: {
//            Text(mensagemErro ?? "")
//        }
//        .sheet(item: $selecionado) { dormente in
//            Text(dormente.nome) // Substitua pela tela de detalhes
//        }
//    }
//
//    private func cor(_ status: Status) -> Color {
//        switch status {
//        case .pending: .orange
//        case .approved: .green
//        case .refused: .red
//        }
//    }
//}
//
//#Preview {
//    DormenteMenu()
//}
