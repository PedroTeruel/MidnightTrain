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
        let container = try ModelContainer(for: Dormente.self, Lote.self, configurations: configuration)
        let context = container.mainContext
        context.autosaveEnabled = false
        try DormenteStore.seedIfNeeded(in: context)
        try DormenteStore.vincularDormentesExistentes(in: context)
        try DormenteStore.migrarEtiquetasParaLotes(in: context)

        if phase == "write" {
            var cadastro = LoteCadastro()
            cadastro.id = "L-42"
            cadastro.setor = "C"
            cadastro.patio = "Pátio B"
            cadastro.tamanho = "250 × 25 × 17 cm"
            cadastro.especies = "Eucalipto, Araucária"
            cadastro.condicao = .aprovado
            cadastro.descricao = "Inspecionado no recebimento."
            cadastro.quantidade = 2
            cadastro.itens[0] = .init(nome: "Dormente A", condicao: "Boa", especie: "Eucalipto")

            do {
                try cadastro.salvar(lote: nil, no: context)
                preconditionFailure("Partial registration should fail")
            } catch LoteCadastro.ErroCadastro.dormentesIncompletos {}

            cadastro.itens[1] = .init(nome: "Dormente B", especie: "Araucária")
            cadastro.codigoNFC = "DORMENTE-001"
            do {
                try cadastro.salvar(lote: nil, no: context)
                preconditionFailure("Duplicate NFC code should fail")
            } catch LoteCadastro.ErroCadastro.etiquetaDuplicada {}

            cadastro.codigoNFC = "  TAG-LOTE  "
            try cadastro.salvar(lote: nil, no: context)

            do {
                try cadastro.salvar(lote: nil, no: context)
                preconditionFailure("Duplicate lot ID should fail")
            } catch LoteCadastro.ErroCadastro.loteDuplicado {}

            let lotes = try context.fetch(FetchDescriptor<Lote>())
            precondition(lotes.count == 2)
            let lote = lotes.first { $0.id == "L-42" }!
            var edicao = LoteCadastro(lote: lote)
            edicao.setor = "D"
            edicao.condicao = .reprovado
            try edicao.salvar(lote: lote, no: context)

            let dormente = lote.dormentes.first { $0.especie == "Eucalipto" }!
            let original = DormenteEdicao(dormente: dormente)
            var rascunho = original
            rascunho.nome = "   "
            precondition(!rascunho.isValid)
            precondition(DormenteEdicao(dormente: dormente) == original)
            rascunho.nome = "Dormente A revisado"
            rascunho.apply(to: dormente)
            try context.save()
            print("PASS: lot registration, validation, editing and isolated draft")
        } else {
            let lotes = try context.fetch(FetchDescriptor<Lote>())
            let registros = try context.fetch(FetchDescriptor<Dormente>())
            let original = lotes.first { $0.id == "1" }!
            precondition(original.dormentes.count == 3)
            precondition(original.dormentes.contains { $0.id == "147" })
            precondition(original.dormentes.allSatisfy { $0.codigoNFC == nil })
            precondition(Lote.identificado(por: "DORMENTE-001", em: lotes) === original)
            precondition(Lote.identificado(por: "DORMENTE-003", em: lotes) === original)
            precondition(Lote.identificado(por: "TAG-DESCONHECIDA", em: lotes) == nil)

            if phase == "migration" {
                precondition(lotes.count == 1 && registros.count == 3)
                precondition(original.condicao == .pendente)
                precondition(original.dormentes.contains { $0.nome == "Dormente legado" && $0.condicao == "Boa" })
                print("PASS: existing store upgraded and original NFC association preserved")
                return
            }

            precondition(lotes.count == 2 && registros.count == 5)
            let lote = lotes.first { $0.id == "L-42" }!
            precondition(lote.setor == "D" && lote.patio == "Pátio B")
            precondition(lote.condicao == .reprovado && lote.descricao == "Inspecionado no recebimento.")
            precondition(lote.tamanho == "250 × 25 × 17 cm" && lote.especies == "Eucalipto, Araucária")
            precondition(lote.dormentes.count == 2)
            precondition(lote.codigoNFC == "TAG-LOTE")
            precondition(Lote.identificado(por: "TAG-LOTE", em: lotes) === lote)
            let ambiguo = Lote(id: "Ambíguo", setor: "C", patio: "", tamanho: "", especies: "")
            ambiguo.codigoNFC = "TAG-LOTE"
            precondition(Lote.identificado(por: "TAG-LOTE", em: lotes + [ambiguo]) == nil)
            let dormente = lote.dormentes.first { $0.especie == "Eucalipto" }!
            precondition(dormente.loteRegistro?.id == lote.id && dormente.nome == "Dormente A revisado")
            precondition(dormente.especie == "Eucalipto" && dormente.condicao == "Boa")
            print("PASS: lot metadata, individual records and NFC associations persisted after restart")
        }
    }
}
