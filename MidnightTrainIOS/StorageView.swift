//
//  StorageView.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import SwiftUI

struct StorageView: View {
    var body: some View {
        NavigationStack{
            VStack(spacing: 22){
                
            }
            .toolbar{
                ToolbarItem(placement: .primaryAction){
                    Button{
                        
                    } label: {
                        Image(systemName: "ellipsis")
                    }
                    .accessibilityLabel("Mais opções")
                }
            }
            .navigationTitle("Estoque")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

#Preview {
    StorageView()
}
