//
//  NFCScanButton.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import SwiftUI

struct NFCScanButton: View {
    @ObservedObject var nfcManager: NFCManager
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    var body: some View {
        Button{
            nfcManager.startReading()
        } label: {
            (dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 8)) : AnyLayout(HStackLayout())) {
                Image(systemName: "sensor.tag.radiowaves.forward.fill")
                    .font(.body)
                    .fontWeight(.medium)
                    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                    .accessibilityHidden(true)
                Text("Identificar lote")
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .font(.body)
                    .fontWeight(.medium)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .frame(minHeight: 52)
            .background(
                Color(red: 0, green: 0.32, blue: 0.76),
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
