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
        let container = try ModelContainer(for: Dormente.self, configurations: configuration)
        try seedIfNeeded(in: container.mainContext)
        return container
    }

    static func seedIfNeeded(in context: ModelContext) throws {
        guard try context.fetchCount(FetchDescriptor<Dormente>()) == 0 else { return }
        for dormente in Dormente.exemplos {
            context.insert(dormente)
        }
        try context.save()
    }
}
