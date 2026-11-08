//
//  StorageView.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//
import SwiftUI

struct StorageView: View {
    @State private var dormentes = Dormente.exemplos
    @State private var busca = ""
    @State private var filtroStatus: Status?
    @StateObject private var nfcManager = NFCManager()
    
    @State private var scannedDormenteID: String?
    @State private var showUnknownDormenteAlert = false

    private var dormentesFiltrados: [Dormente] {
        let termo = busca.trimmingCharacters(in: .whitespacesAndNewlines)

        return dormentes.filter { dormente in
            let correspondeBusca =
                termo.isEmpty ||
                dormente.nome.localizedStandardContains(termo) ||
                dormente.lote.localizedStandardContains(termo) ||
                dormente.setor.localizedStandardContains(termo)

            let correspondeStatus =
                filtroStatus.map { dormente.status == $0 } ?? true

            return correspondeBusca && correspondeStatus
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    NFCScanButton(nfcManager: nfcManager)

                    if dormentesFiltrados.isEmpty {
                        Text("Nenhum dormente encontrado")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 40)
                    } else {
                        DormenteMenu(dormentes: dormentesFiltrados)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                barraDeBusca
            }
            .navigationTitle("Estoque")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(item: $scannedDormenteID) { dormenteID in
                if let dormente = dormentes.first(where: { $0.id == dormenteID }) {
                    EachDormenteView(dormente: dormente)
                } else {
                    ContentUnavailableView(
                        "Dormente não encontrado",
                        systemImage: "shippingbox"
                    )
                }
            }

//            .toolbar {
//                ToolbarItem(placement: .primaryAction) {
//                    Button {
//                        // Adicione aqui a ação de "Mais opções".
//                    } label: {
//                        Image(systemName: "ellipsis")
//                    }
//                    .accessibilityLabel("Mais opções")
//                }
//            }
        }
        .onChange(of: nfcManager.scannedCode) { _, newCode in
            guard let code = newCode else {
                return
            }

            if let dormente = dormenteForTag(code) {
                scannedDormenteID = dormente.id
            } else {
                showUnknownDormenteAlert = true
            }
        }
        .alert("Não foi possível ler a etiqueta", isPresented: Binding(
            get: { nfcManager.errorMessage != nil },
            set: { if !$0 { nfcManager.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { nfcManager.errorMessage = nil }
        } message: {
            Text(nfcManager.errorMessage ?? "")
        }
        .alert(
            "Dormente não encontrado",
            isPresented: $showUnknownDormenteAlert
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Não encontramos um dormente associado a esta tag NFC.")
        }
    }

    private var barraDeBusca: some View {
        HStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                    .accessibilityHidden(true)
                    .foregroundStyle(.primary)

                TextField("Buscar lote ou setor", text: $busca)
                    .accessibilityLabel("Buscar lote ou setor")
                    .autocorrectionDisabled()
                    .submitLabel(.search)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(minHeight: 50)
            .background(.regularMaterial, in: Capsule())
            .overlay {
                Capsule()
                    .stroke(Color(uiColor: .separator), lineWidth: 1)
            }

            Menu {
                Button("Todos") {
                    filtroStatus = nil
                }

                Divider()

                Button("Pendente") {
                    filtroStatus = .pending
                }

                Button("Aprovado") {
                    filtroStatus = .approved
                }

                Button("Recusado") {
                    filtroStatus = .refused
                }
            } label: {
                Image(systemName: "line.3.horizontal.decrease")
                    .font(.title3)
                    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                    .foregroundStyle(.primary)
                    .frame(width: 50, height: 50)
                    .background(.regularMaterial, in: Circle())
                    .overlay {
                        Circle()
                            .stroke(Color(uiColor: .separator), lineWidth: 1)
                    }
            }
            .accessibilityLabel("Filtrar por status")
            .accessibilityValue(filtroStatus?.rawValue ?? "Todos")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        //.background(.regularMaterial)
        .background(Color(uiColor: .systemBackground))
    }
    
    private func dormenteForTag(_ code: String) -> Dormente? {
        let mapping: [String: String] = [
            "DORMENTE-001": "147",
            "DORMENTE-002": "146",
            "DORMENTE-003": "145"
        ]

        guard let id = mapping[code] else {
            return nil
        }

        return dormentes.first { $0.id == id }
    }

}

#Preview {
    StorageView()
}
