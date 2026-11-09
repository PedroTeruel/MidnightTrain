import SwiftUI

struct DormenteMenu: View {
    let dormentes: [Dormente]

    var body: some View {
        ForEach(dormentes) { dormente in
            NavigationLink {
                EachDormenteView(dormente: dormente)
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text(dormente.nome).font(.headline)
                    Text(dormente.condicao).font(.subheadline).foregroundStyle(.secondary)
                }
                .frame(minHeight: 44, alignment: .leading)
                .accessibilityElement(children: .combine)
            }
        }
    }
}
