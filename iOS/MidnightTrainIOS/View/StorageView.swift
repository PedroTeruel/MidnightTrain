//
//  StorageView.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//
import SwiftUI
import SwiftData

struct StorageView: View {
    @Query(sort: \Lote.id) private var lotes: [Lote]
    @State private var cadastroLote: CadastroLote?
    @State private var busca = ""
    @State private var filtroStatus: CondicaoLote?
    @StateObject private var nfcManager = NFCManager()
    
    @State private var loteIdentificado: Lote?
    @State private var codigoNaoCadastrado: String?
    @State private var etiquetaAmbigua = false

    private struct CadastroLote: Identifiable {
        let id = UUID()
        var codigoNFC: String?
    }

    private var lotesFiltrados: [Lote] {
        let termo = busca.trimmingCharacters(in: .whitespacesAndNewlines)
        return lotes.filter { lote in
            let correspondeBusca = termo.isEmpty ||
                [lote.id, lote.setor, lote.patio, lote.especies].contains {
                    $0.localizedStandardContains(termo)
                }
            return correspondeBusca && (filtroStatus == nil || lote.condicao == filtroStatus)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    NFCScanButton(nfcManager: nfcManager)

                    if lotesFiltrados.isEmpty {
                        Text("Nenhum lote encontrado")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 40)
                    } else {
                        ForEach(lotesFiltrados) { lote in
                            NavigationLink {
                                LoteView(lote: lote)
                            } label: {
                                HStack(spacing: 14) {
                                    Image(systemName: "shippingbox")
                                        .font(.title2)
                                        .accessibilityHidden(true)
                                    VStack(alignment: .leading, spacing: 5) {
                                        Text("Lote \(lote.id)").font(.headline)
                                        Text("Setor \(lote.setor) · \(lote.dormentes.count) dormentes")
                                        Text(lote.condicao.rawValue).fontWeight(.medium)
                                    }
                                    Spacer(minLength: 0)
                                    Image(systemName: "chevron.right")
                                        .font(.footnote.weight(.semibold))
                                        .accessibilityHidden(true)
                                }
                                .foregroundStyle(.primary)
                                .padding()
                                .frame(minHeight: 44)
                                .background(
                                    Color(uiColor: .secondarySystemGroupedBackground),
                                    in: RoundedRectangle(cornerRadius: 20)
                                )
                                .shadow(color: .black.opacity(0.12), radius: 14, y: 7)
                            }
                            .buttonStyle(.plain)
                        }
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
            .navigationDestination(item: $loteIdentificado) { lote in
                LoteView(lote: lote)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Registrar lote", systemImage: "plus") { cadastroLote = CadastroLote() }
                }
            }
            .sheet(item: $cadastroLote) { cadastro in
                LoteEditSheet(codigoNFCInicial: cadastro.codigoNFC)
            }
        }
        .onChange(of: nfcManager.scannedCode) { _, newCode in
            guard let code = newCode else {
                return
            }

            if let lote = Lote.identificado(por: code, em: lotes) {
                loteIdentificado = lote
            } else if lotes.contains(where: { $0.correspondeEtiqueta(code) }) {
                etiquetaAmbigua = true
            } else {
                codigoNaoCadastrado = code
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
        .alert("Etiqueta ainda sem lote", isPresented: Binding(
            get: { codigoNaoCadastrado != nil },
            set: { if !$0 { codigoNaoCadastrado = nil } }
        ), presenting: codigoNaoCadastrado) { codigo in
            Button("Registrar lote") { cadastroLote = CadastroLote(codigoNFC: codigo) }
            Button("Cancelar", role: .cancel) {}
        } message: { _ in
            Text("Você pode registrar um lote e associar esta etiqueta a ele.")
        }
        .alert("Etiqueta associada a vários lotes", isPresented: $etiquetaAmbigua) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("A etiqueta precisa estar associada a um único lote. Verifique o código em Editar lote.")
        }
    }

    private var barraDeBusca: some View {
        HStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                    .accessibilityHidden(true)
                    .foregroundStyle(.primary)

                TextField("Buscar lote, setor ou espécie", text: $busca)
                    .accessibilityLabel("Buscar lote, setor ou espécie")
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

                ForEach(CondicaoLote.allCases, id: \.self) { condicao in
                    Button(condicao.rawValue) { filtroStatus = condicao }
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
            .accessibilityLabel("Filtrar lotes por condição")
            .accessibilityValue(filtroStatus?.rawValue ?? "Todos")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        //.background(.regularMaterial)
        .background(Color(uiColor: .systemBackground))
    }
    

}

#Preview {
    StorageView()
        .modelContainer(try! DormenteStore.makeContainer(inMemory: true))
}
