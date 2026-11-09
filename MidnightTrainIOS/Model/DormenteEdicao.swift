//
//  DormenteEdicao.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 08/11/26.
//

import Foundation

struct DormenteEdicao: Equatable {
    var nome: String
    var lote: String
    var patio: String
    var setor: String
    var codigoNFC: String
    var status: Status
    var condicao: String
    var tamanho: String
    var especie: String
    var descricao: String

    init(dormente: Dormente) {
        nome = dormente.nome
        lote = dormente.lote
        patio = dormente.patio
        setor = dormente.setor
        codigoNFC = dormente.codigoNFC ?? ""
        status = dormente.status
        condicao = dormente.condicao
        tamanho = dormente.tamanho
        especie = dormente.especie
        descricao = dormente.descricao
    }

    var isValid: Bool {
        [nome, lote, patio, setor].allSatisfy {
            !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    func apply(to dormente: Dormente) {
        dormente.nome = nome
        dormente.lote = lote
        dormente.patio = patio
        dormente.setor = setor
        dormente.codigoNFC = codigoNFC.isEmpty ? nil : codigoNFC
        dormente.status = status
        dormente.condicao = condicao
        dormente.tamanho = tamanho
        dormente.especie = especie
        dormente.descricao = descricao
    }
}
