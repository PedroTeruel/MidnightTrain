//
//  NFCScanButton.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import SwiftUI

struct NFCScanButton: View {
    @ObservedObject var nfcManager: NFCManager
    var body: some View {
        Button{
            nfcManager.startReading()
        } label: {
            HStack {
                Image(systemName: "sensor.tag.radiowaves.forward.fill")
                    .font(.body)
                    .fontWeight(.medium)
                Text("Identificar dormente")
                    .font(.body)
                    .fontWeight(.medium)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                Color(.blue),
                in: Capsule()
            )
            .shadow(
                color: .black.opacity(0.20),
                radius: 10,
                x: 0,
                y: 6
            )
        }
    }
}

#Preview {
    NFCScanButton(nfcManager: NFCManager())
}
