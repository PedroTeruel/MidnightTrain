// Standalone integration test; run with Tests/run-swiftdata-tests.sh.
import Foundation
import SwiftData

@main
struct SwiftDataPersistenceTests {
    @MainActor
    static func main() throws {
        let phase = CommandLine.arguments[1]
        let url = URL(fileURLWithPath: CommandLine.arguments[2])
        let configuration = ModelConfiguration(url: url, cloudKitDatabase: .none)
        let container = try ModelContainer(for: Dormente.self, configurations: configuration)
        let context = container.mainContext
        context.autosaveEnabled = false
        try DormenteStore.seedIfNeeded(in: context)
        let records = try context.fetch(FetchDescriptor<Dormente>())
        precondition(records.count == 3, "Seed must not duplicate records")
        let record = records.first { $0.id == "147" }!

        if phase == "write" {
            precondition(record.codigoNFC == "DORMENTE-001")
            record.codigoNFC = "TAG-TESTE"
            record.nome = "Dormente de teste"
            record.lote = "Lote 42"
            record.setor = "C"
            record.patio = "Pátio B"
            record.status = .refused
            record.condicao = "Ruim"
            record.tamanho = "250 × 25 × 17 cm"
            record.especie = "Eucalipto"
            record.descricao = "Fissura na extremidade; revisão necessária."
            record.ultimaAtualizacao = Date(timeIntervalSince1970: 1_800_000_000)
            try context.save()
            try DormenteStore.seedIfNeeded(in: context)
            let count = try context.fetchCount(FetchDescriptor<Dormente>())
            precondition(count == 3)
            print("PASS: initial seed, update and repeated seed")
        } else {
            precondition(record.codigoNFC == "TAG-TESTE")
            precondition(record.nome == "Dormente de teste")
            precondition(record.lote == "Lote 42" && record.setor == "C")
            precondition(record.patio == "Pátio B")
            precondition(record.status == .refused && record.condicao == "Ruim")
            precondition(record.tamanho == "250 × 25 × 17 cm")
            precondition(record.especie == "Eucalipto")
            precondition(record.descricao == "Fissura na extremidade; revisão necessária.")
            precondition(record.ultimaAtualizacao == Date(timeIntervalSince1970: 1_800_000_000))
            precondition(records.first { $0.id == "146" }?.status == .approved)
            precondition(records.first { $0.id == "145" }?.status == .refused)
            print("PASS: all fields persisted across process restart; existing records preserved")
        }
    }
}
