//
//  MidnightTrainIOSApp.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import SwiftUI
import SwiftData

@main
struct MidnightTrainIOSApp: App {
    private let storage: Result<ModelContainer, Error>

    init() {
        storage = Result { try DormenteStore.makeContainer() }
    }

    var body: some Scene {
        WindowGroup {
            switch storage {
            case .success(let container):
                StorageView()
                    .modelContainer(container)
            case .failure(let error):
                ContentUnavailableView {
                    Label("Não foi possível abrir o estoque", systemImage: "externaldrive.badge.exclamationmark")
                } description: {
                    Text(error.localizedDescription)
                }
            }
        }
    }
}
