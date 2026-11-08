//
//  Dormente.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import Foundation

struct Dormente: Identifiable {
    let id: String
    let nome: String
    let lote: String
    let setor: String
    let status: Status

    static let exemplos: [Dormente] = [
        .init(id: "147", nome: "D-0147", lote: "1", setor: "A", status: .pending),
        .init(id: "146", nome: "D-0146", lote: "1", setor: "A", status: .approved),
        .init(id: "145", nome: "D-0145", lote: "1", setor: "A", status: .refused)
    ]
}

enum Status: String, CaseIterable {
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
