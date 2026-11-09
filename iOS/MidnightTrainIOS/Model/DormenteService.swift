//
//  DormenteService.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

//import Foundation
//
//struct DormenteService {
//    func listar() async throws -> [Dormente] {
//        guard let url = URL(string: "https://sua-api.com/dormentes") else {
//            throw URLError(.badURL)
//        }
//
//        let (data, response) = try await URLSession.shared.data(from: url)
//
//        guard let response = response as? HTTPURLResponse,
//              (200...299).contains(response.statusCode) else {
//            throw URLError(.badServerResponse)
//        }
//
//        return try JSONDecoder().decode([Dormente].self, from: data)
//    }
//}
