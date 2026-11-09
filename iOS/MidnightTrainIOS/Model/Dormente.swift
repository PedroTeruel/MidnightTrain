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
    var loteRegistro: Lote?
    var condicao: String
    var tamanho: String
    var especie: String
    var ultimaAtualizacao: Date

    init(
        id: String,
        nome: String,
        lote: String,
        setor: String,
        codigoNFC: String? = nil,
        patio: String = "Pátio A",
        condicao: String = "Não avaliada",
        tamanho: String = "32x29m",
        especie: String = "Araucária",
        ultimaAtualizacao: Date = .now
    ) {
        self.id = id
        self.nome = nome
        self.lote = lote
        self.setor = setor
        self.codigoNFC = codigoNFC
        self.patio = patio
        self.condicao = condicao
        self.tamanho = tamanho
        self.especie = especie
        self.ultimaAtualizacao = ultimaAtualizacao
    }

    // Fresh instances keep previews and the persistent store independent.
    static var exemplos: [Dormente] {
        [
            .init(id: "147", nome: "D-0147", lote: "1", setor: "A", codigoNFC: "DORMENTE-001"),
            .init(id: "146", nome: "D-0146", lote: "1", setor: "A", codigoNFC: "DORMENTE-002"),
            .init(id: "145", nome: "D-0145", lote: "1", setor: "A", codigoNFC: "DORMENTE-003")
        ]
    }
}
