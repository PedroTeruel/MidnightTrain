//
//  Lote.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 09/11/26.
//

import Foundation
import SwiftData

@Model
final class Lote {
    @Attribute(.unique) var id: String
    var setor: String
    var patio: String
    var tamanho: String
    var especies: String
    var condicao: CondicaoLote
    var descricao: String
    var codigoNFC: String?
    var codigosNFCLegados: [String]?
    @Relationship(deleteRule: .cascade, inverse: \Dormente.loteRegistro)
    var dormentes: [Dormente] = []

    init(id: String, setor: String, patio: String, tamanho: String, especies: String,
         condicao: CondicaoLote = .pendente, descricao: String = "") {
        self.id = id
        self.setor = setor
        self.patio = patio
        self.tamanho = tamanho
        self.especies = especies
        self.condicao = condicao
        self.descricao = descricao
    }

    func correspondeEtiqueta(_ codigo: String) -> Bool {
        codigoNFC == codigo || (codigosNFCLegados?.contains(codigo) ?? false)
    }

    static func identificado(por codigo: String, em lotes: [Lote]) -> Lote? {
        let correspondencias = lotes.filter { $0.correspondeEtiqueta(codigo) }
        return correspondencias.count == 1 ? correspondencias.first : nil
    }
}

enum CondicaoLote: String, CaseIterable, Codable {
    case pendente = "Pendente"
    case aprovado = "Aprovado"
    case reprovado = "Reprovado"
}
