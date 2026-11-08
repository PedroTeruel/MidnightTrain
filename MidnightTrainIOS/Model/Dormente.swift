//
//  Dormente.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import Foundation
import SwiftData

@Model
final class Dormente {
    @Attribute(.unique) var id: String
    var nome: String
    var lote: String
    var setor: String
    var codigoNFC: String?
    var patio: String
    var status: Status
    var condicao: String
    var tamanho: String
    var especie: String
    var descricao: String
    var ultimaAtualizacao: Date

    init(
        id: String,
        nome: String,
        lote: String,
        setor: String,
        status: Status,
        codigoNFC: String? = nil,
        patio: String = "Pátio A",
        condicao: String = "Não avaliada",
        tamanho: String = "32x29m",
        especie: String = "Araucária",
        descricao: String = "",
        ultimaAtualizacao: Date = .now
    ) {
        self.id = id
        self.nome = nome
        self.lote = lote
        self.setor = setor
        self.codigoNFC = codigoNFC
        self.patio = patio
        self.status = status
        self.condicao = condicao
        self.tamanho = tamanho
        self.especie = especie
        self.descricao = descricao
        self.ultimaAtualizacao = ultimaAtualizacao
    }

    // Fresh instances keep previews and the persistent store independent.
    static var exemplos: [Dormente] {
        [
            .init(id: "147", nome: "D-0147", lote: "1", setor: "A", status: .pending, codigoNFC: "DORMENTE-001"),
            .init(id: "146", nome: "D-0146", lote: "1", setor: "A", status: .approved, codigoNFC: "DORMENTE-002"),
            .init(id: "145", nome: "D-0145", lote: "1", setor: "A", status: .refused, codigoNFC: "DORMENTE-003")
        ]
    }
}

enum Status: String, CaseIterable, Codable {
    case pending = "Pendente"
    case approved = "Aprovado"
    case refused = "Recusado"
}


//
//struct Dormente: Identifiable, Decodable {
//    let id: String
//    let nome: String
//    let lote: String
//    let setor: String
//    let status: Status
//}
//
//enum Status: String, Decodable {
//    case pending = "Pendente"
//    case approved = "Aprovado"
//    case recused = "Recusado"
//}
