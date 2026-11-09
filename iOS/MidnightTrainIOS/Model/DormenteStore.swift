//
//  DormenteStore.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import SwiftData

@MainActor
enum DormenteStore {
    static func makeContainer(inMemory: Bool = false) throws -> ModelContainer {
        let configuration = ModelConfiguration(isStoredInMemoryOnly: inMemory)
        let container = try ModelContainer(for: Dormente.self, Lote.self, configurations: configuration)
        try seedIfNeeded(in: container.mainContext)
        try vincularDormentesExistentes(in: container.mainContext)
        try migrarEtiquetasParaLotes(in: container.mainContext)
        return container
    }

    static func seedIfNeeded(in context: ModelContext) throws {
        guard try context.fetchCount(FetchDescriptor<Dormente>()) == 0 else { return }
        for dormente in Dormente.exemplos {
            context.insert(dormente)
        }
        try context.save()
    }
    static func vincularDormentesExistentes(in context: ModelContext) throws {
        let existentes = try context.fetch(FetchDescriptor<Dormente>())
            .filter { $0.loteRegistro == nil }
        guard !existentes.isEmpty else { return }

        var lotes = Dictionary(uniqueKeysWithValues: try context.fetch(FetchDescriptor<Lote>())
            .map { ($0.id, $0) })
        for (id, dormentes) in Dictionary(grouping: existentes, by: \.lote) {
            guard let primeiro = dormentes.sorted(by: { $0.id < $1.id }).first else { continue }
            let lote: Lote
            if let existente = lotes[id] {
                lote = existente
            } else {
                lote = Lote(
                    id: id, setor: primeiro.setor, patio: primeiro.patio,
                    tamanho: Set(dormentes.map(\.tamanho)).sorted().joined(separator: ", "),
                    especies: Set(dormentes.map(\.especie)).sorted().joined(separator: ", ")
                )
                context.insert(lote)
                lotes[id] = lote
            }
            for dormente in dormentes {
                dormente.loteRegistro = lote
            }
        }
        try context.save()
    }

    static func migrarEtiquetasParaLotes(in context: ModelContext) throws {
        let dormentes = try context.fetch(FetchDescriptor<Dormente>())
        for dormente in dormentes {
            guard let codigo = dormente.codigoNFC, let lote = dormente.loteRegistro else { continue }
            if !lote.correspondeEtiqueta(codigo) {
                lote.codigosNFCLegados = (lote.codigosNFCLegados ?? []) + [codigo]
            }
            dormente.codigoNFC = nil
        }
        if context.hasChanges { try context.save() }
    }
}
