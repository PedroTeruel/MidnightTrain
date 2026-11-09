//
//  LoteCadastro.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 09/11/26.
//

import Foundation
import SwiftData

struct LoteCadastro {
    struct Item {
        var nome = ""
        var condicao = "Não avaliada"
        var tamanho = ""
        var especie = ""
    }

    var id = ""
    var codigoNFC = ""
    var setor = ""
    var patio = ""
    var tamanho = ""
    var especies = ""
    var condicao = CondicaoLote.pendente
    var descricao = ""
    var quantidade = 1
    var itens: [Int: Item] = [:]

    init(lote: Lote? = nil) {
        guard let lote else { return }
        id = lote.id
        codigoNFC = lote.codigoNFC ?? ""
        setor = lote.setor
        patio = lote.patio
        tamanho = lote.tamanho
        especies = lote.especies
        condicao = lote.condicao
        descricao = lote.descricao
        quantidade = lote.dormentes.count
    }

    static let faixaQuantidade = 1...500

    var dadosValidos: Bool {
        [id, setor, tamanho, especies].allSatisfy { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    func salvar(lote existente: Lote?, no context: ModelContext) throws {
        guard dadosValidos else { throw ErroCadastro.dadosIncompletos }
        let identificador = id.trimmingCharacters(in: .whitespacesAndNewlines)
        let lotes = try context.fetch(FetchDescriptor<Lote>())
        guard !lotes.contains(where: { $0 !== existente && $0.id == identificador }) else {
            throw ErroCadastro.loteDuplicado
        }

        let codigo = codigoNFC.trimmingCharacters(in: .whitespacesAndNewlines)
        if !codigo.isEmpty, lotes.contains(where: { $0 !== existente && $0.correspondeEtiqueta(codigo) }) {
            throw ErroCadastro.etiquetaDuplicada(codigo)
        }

        var novos: [Dormente] = []
        if existente == nil {
            guard Self.faixaQuantidade.contains(quantidade) else { throw ErroCadastro.quantidadeInvalida }
            let cadastrados = (0..<quantidade).compactMap { itens[$0] }
            guard cadastrados.count == quantidade,
                  cadastrados.allSatisfy({ !$0.nome.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else {
                throw ErroCadastro.dormentesIncompletos
            }
            for item in cadastrados {
                novos.append(Dormente(
                    id: UUID().uuidString, nome: item.nome.trimmingCharacters(in: .whitespacesAndNewlines),
                    lote: identificador, setor: setor,
                    patio: patio, condicao: item.condicao,
                    tamanho: item.tamanho.isEmpty ? tamanho : item.tamanho,
                    especie: item.especie.isEmpty ? especies : item.especie
                ))
            }
        }

        let lote = existente ?? Lote(id: identificador, setor: setor, patio: patio, tamanho: tamanho, especies: especies)
        let anterior = LoteCadastro(lote: lote)
        aplicar(ao: lote)
        if existente == nil {
            context.insert(lote)
            lote.dormentes = novos
        }
        do {
            try context.save()
        } catch {
            if existente == nil {
                context.delete(lote)
            } else {
                anterior.aplicar(ao: lote)
            }
            throw error
        }
    }

    private func aplicar(ao lote: Lote) {
        lote.id = id.trimmingCharacters(in: .whitespacesAndNewlines)
        let codigo = codigoNFC.trimmingCharacters(in: .whitespacesAndNewlines)
        lote.codigoNFC = codigo.isEmpty ? nil : codigo
        lote.setor = setor
        lote.patio = patio
        lote.tamanho = tamanho
        lote.especies = especies
        lote.condicao = condicao
        lote.descricao = descricao
    }

    enum ErroCadastro: LocalizedError {
        case dadosIncompletos, loteDuplicado, dormentesIncompletos, quantidadeInvalida
        case etiquetaDuplicada(String)

        var errorDescription: String? {
            switch self {
            case .dadosIncompletos: "Preencha ID, setor, tamanho e espécies do lote."
            case .quantidadeInvalida: "Informe uma quantidade entre 1 e 500."
            case .loteDuplicado: "Já existe um lote com esse ID."
            case .dormentesIncompletos: "Informe o nome de cada dormente do lote."
            case .etiquetaDuplicada(let codigo): "O código NFC \(codigo) já está associado a outro lote."
            }
        }
    }
}
