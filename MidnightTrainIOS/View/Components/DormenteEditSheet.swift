//
//  DormenteEditSheet.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 08/11/26.
//

import SwiftUI
import SwiftData

struct DormenteEditSheet: View {
    let dormente: Dormente
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @State private var draft: DormenteEdicao
    @State private var discardConfirmation = false
    @State private var saveError: String?
    private let original: DormenteEdicao

    init(dormente: Dormente) {
        self.dormente = dormente
        let snapshot = DormenteEdicao(dormente: dormente)
        original = snapshot
        _draft = State(initialValue: snapshot)
    }

    private var hasChanges: Bool { draft != original }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    campo("Nome", text: $draft.nome)
                    campo("Lote", text: $draft.lote)
                } header: {
                    Text("Identificação")
                } footer: {
                    Text("Nome, lote, pátio e setor são obrigatórios.")
                }

                Section("Local") {
                    campo("Pátio", text: $draft.patio)
                    campo("Setor", text: $draft.setor)
                }

                Section("Inspeção") {
                    Picker("Decisão", selection: $draft.status) {
                        ForEach(Status.allCases, id: \.self) { status in
                            Text(status.rawValue).tag(status)
                        }
                    }
                    Picker("Condição", selection: $draft.condicao) {
                        ForEach(["Não avaliada", "Boa", "Atenção", "Ruim"], id: \.self) { value in
                            Text(value).tag(value)
                        }
                    }
                }

                Section("Descrição") {
                    campo("Tamanho", text: $draft.tamanho)
                    campo("Espécie", text: $draft.especie)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Descrição").font(.subheadline).foregroundStyle(.secondary)
                        TextField("Descrição", text: $draft.descricao, axis: .vertical)
                            .lineLimit(3...8)
                    }
                }

                Section {
                    campo("Código da etiqueta", text: $draft.codigoNFC)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("NFC")
                } footer: {
                    Text("Informe o texto gravado na etiqueta NFC associada ao dormente.")
                }
            }
            .navigationTitle("Editar dormente")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        if hasChanges { discardConfirmation = true } else { dismiss() }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar", action: salvar)
                        .fontWeight(.semibold)
                        .disabled(!draft.isValid)
                }
            }
            .confirmationDialog("Descartar alterações?", isPresented: $discardConfirmation, titleVisibility: .visible) {
                Button("Descartar alterações", role: .destructive) { dismiss() }
                Button("Continuar editando", role: .cancel) {}
            }
            .alert("Não foi possível salvar", isPresented: Binding(
                get: { saveError != nil },
                set: { if !$0 { saveError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(saveError ?? "")
            }
        }
        .interactiveDismissDisabled(hasChanges)
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private func campo(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.subheadline).foregroundStyle(.secondary)
            TextField(title, text: text)
        }
    }

    private func salvar() {
        guard draft.isValid else { return }
        let previous = DormenteEdicao(dormente: dormente)
        let previousDate = dormente.ultimaAtualizacao
        draft.apply(to: dormente)
        if hasChanges { dormente.ultimaAtualizacao = .now }
        do {
            try modelContext.save()
            dismiss()
        } catch {
            previous.apply(to: dormente)
            dormente.ultimaAtualizacao = previousDate
            saveError = error.localizedDescription
        }
    }
}
