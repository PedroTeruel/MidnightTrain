//
//  DormenteEdicao.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 08/11/26.
//

import Foundation

struct DormenteEdicao: Equatable {
    var nome: String
    var condicao: String
    var tamanho: String
    var especie: String

    init(dormente: Dormente) {
        nome = dormente.nome
        condicao = dormente.condicao
        tamanho = dormente.tamanho
        especie = dormente.especie
    }

    var isValid: Bool {
        !nome.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    func apply(to dormente: Dormente) {
        dormente.nome = nome
        dormente.condicao = condicao
        dormente.tamanho = tamanho
        dormente.especie = especie
    }
}
