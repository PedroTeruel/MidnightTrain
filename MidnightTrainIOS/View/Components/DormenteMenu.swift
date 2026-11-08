//
//  DormenteMenu.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//
import SwiftUI
import SwiftData

struct DormenteMenu: View {
    let dormentes: [Dormente]
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    //@State private var dormentes: [Dormente] = []
    //@State private var selecionado: Dormente?

    var body: some View {
        VStack(spacing: 0) {
            ForEach(dormentes) { dormente in
                NavigationLink {
                    EachDormenteView(dormente: dormente)
                } label: {
                    (dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 10))) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(dormente.nome)
                                .font(.headline)
                                .foregroundStyle(.primary)

                            Text("Lote \(dormente.lote) – Setor \(dormente.setor)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        if !dynamicTypeSize.isAccessibilitySize {
                            Spacer(minLength: 8)
                        }

                        Text(dormente.status.rawValue)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                cor(dormente.status).opacity(0.18),
                                in: RoundedRectangle(cornerRadius: 10)
                            )

                        Image(systemName: "chevron.right")
                            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.primary)
                            .frame(width: 36, height: 36)
                            .background(Color(uiColor: .tertiarySystemGroupedBackground), in: Circle())
                            .accessibilityHidden(true)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .frame(minHeight: 88)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityElement(children: .combine)

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
                .stroke(Color(uiColor: .separator), lineWidth: 1)
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
    let container = try! DormenteStore.makeContainer(inMemory: true)
    let dormentes = try! container.mainContext.fetch(FetchDescriptor<Dormente>())
    NavigationStack {
        DormenteMenu(dormentes: dormentes)
            .padding()
    }
    .modelContainer(container)
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
//                                .foregroundStyle(.primary)
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
