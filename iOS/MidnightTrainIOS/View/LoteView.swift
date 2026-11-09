//
//  LoteView.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 09/11/26.
//

import SwiftUI

struct LoteView: View {
    let lote: Lote
    @State private var editando = false

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Image(systemName: "shippingbox.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.tint)
                        .accessibilityHidden(true)
                    Text("Lote \(lote.id)")
                        .font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                    Text("Setor \(lote.setor) · \(lote.dormentes.count) dormentes")
                        .foregroundStyle(.secondary)
                    Button("Editar lote", systemImage: "pencil") { editando = true }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                }
                .padding(.vertical, 8)
            }
            Section("Informações") {
                LabeledContent("Condição", value: lote.condicao.rawValue)
                if !lote.patio.isEmpty { LabeledContent("Pátio", value: lote.patio) }
                LabeledContent("Tamanho", value: lote.tamanho)
                LabeledContent("Espécies", value: lote.especies)
                if let codigo = lote.codigoNFC { LabeledContent("Etiqueta NFC", value: codigo) }
                if !lote.descricao.isEmpty { Text(lote.descricao) }
            }
            Section("Dormentes") {
                DormenteMenu(dormentes: lote.dormentes.sorted {
                    $0.nome.localizedStandardCompare($1.nome) == .orderedAscending
                })
            }
        }
        .navigationTitle("Lote \(lote.id)")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $editando) { LoteEditSheet(lote: lote) }
    }
}
