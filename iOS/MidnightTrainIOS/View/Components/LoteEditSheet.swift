//
//  LoteEditSheet.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 09/11/26.
//

import SwiftUI
import SwiftData

struct LoteEditSheet: View {
    let lote: Lote?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var cadastro: LoteCadastro
    @StateObject private var nfcManager = NFCManager()
    @State private var erro: String?

    init(lote: Lote? = nil, codigoNFCInicial: String? = nil) {
        self.lote = lote
        var cadastro = LoteCadastro(lote: lote)
        if lote == nil, let codigoNFCInicial {
            cadastro.codigoNFC = codigoNFCInicial
        }
        _cadastro = State(initialValue: cadastro)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Identificação") {
                    campo("ID do lote", texto: $cadastro.id)
                    campo("Setor", texto: $cadastro.setor)
                    campo("Pátio (opcional)", texto: $cadastro.patio)
                    if lote == nil {
                        LabeledContent("Quantidade") {
                            TextField("Quantidade", value: $cadastro.quantidade, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                        }
                        if !LoteCadastro.faixaQuantidade.contains(cadastro.quantidade) {
                            Text("Informe uma quantidade entre 1 e 500.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        LabeledContent("Quantidade", value: "\(cadastro.quantidade)")
                    }
                }
                Section("Características") {
                    campo("Tamanho dos dormentes", texto: $cadastro.tamanho)
                    campo("Espécies de madeira", texto: $cadastro.especies)
                    Picker("Condição do lote", selection: $cadastro.condicao) {
                        ForEach(CondicaoLote.allCases, id: \.self) { condicao in
                            Text(condicao.rawValue).tag(condicao)
                        }
                    }
                    TextField("Descrição do lote", text: $cadastro.descricao, axis: .vertical)
                        .lineLimit(3...8)
                }
                Section {
                    campo("Código da etiqueta", texto: $cadastro.codigoNFC)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button("Ler etiqueta NFC", systemImage: "sensor.tag.radiowaves.forward.fill") {
                        nfcManager.startReading()
                    }
                } header: {
                    Text("NFC")
                } footer: {
                    Text("Associe uma etiqueta ao lote para encontrá-lo pela leitura no estoque.")
                }

                if lote == nil, LoteCadastro.faixaQuantidade.contains(cadastro.quantidade) {
                    ForEach(0..<cadastro.quantidade, id: \.self) { indice in
                        let item = Binding(
                            get: { cadastro.itens[indice, default: LoteCadastro.Item()] },
                            set: { cadastro.itens[indice] = $0 }
                        )
                        Section("Dormente \(indice + 1)") {
                            campo("Nome", texto: item.nome)
                            campo("Tamanho individual (opcional)", texto: item.tamanho)
                            campo("Espécie individual (opcional)", texto: item.especie)
                            Picker("Condição", selection: item.condicao) {
                                ForEach(["Não avaliada", "Boa", "Atenção", "Ruim"], id: \.self) {
                                    Text($0).tag($0)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(lote == nil ? "Novo lote" : "Editar lote")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(role: .cancel) {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .accessibilityLabel("Cancelar")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") {
                        do {
                            try cadastro.salvar(lote: lote, no: context)
                            dismiss()
                        } catch {
                            erro = error.localizedDescription
                        }
                    }
                }
            }
            .onChange(of: nfcManager.scannedCode) { _, codigo in
                if let codigo { cadastro.codigoNFC = codigo }
            }
            .onChange(of: nfcManager.errorMessage) { _, mensagem in
                if let mensagem { erro = mensagem }
            }
            .alert("Não foi possível concluir", isPresented: Binding(
                get: { erro != nil },
                set: { if !$0 { erro = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(erro ?? "")
            }
        }
        .interactiveDismissDisabled()
    }

    private func campo(_ titulo: String, texto: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(titulo).font(.subheadline).foregroundStyle(.secondary)
            TextField(titulo, text: texto)
        }
    }
}
