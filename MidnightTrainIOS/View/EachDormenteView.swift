//
//  EachDormenteView.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import SwiftUI

struct EachDormenteView: View {
    let dormente: Dormente

    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @State private var condicao = "Não avaliada"
    @State private var tamanho = "32x29m"
    @State private var especie = "Araucária"
    @State private var descricao = ""
    @State private var campoEmEdicao: Campo?

    private enum Campo: String, Identifiable {
        case condicao = "Condição"
        case tamanho = "Tamanho"
        case especie = "Espécie"

        var id: String { rawValue }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                cabecalho

                secao("IDENTIFICAÇÃO") {
                    cartao {
                        linha("Lote") {
                            Text(dormente.lote)
                                .foregroundStyle(.secondary)
                        }

                        Divider()

                        linha("Local") {
                            Text("Pátio A - Setor \(dormente.setor)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                secao("INSPEÇÃO") {
                    cartao {
                        Button {
                            campoEmEdicao = .condicao
                        } label: {
                            linha("Condição") {
                                Text(condicao)
                                    .foregroundStyle(.secondary)

                                Image(systemName: "chevron.right")
                                    .accessibilityHidden(true)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)

                        Divider()

                        linha("Decisão") {
                            Text(dormente.status.rawValue)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(
                                    corDoStatus.opacity(0.16),
                                    in: RoundedRectangle(cornerRadius: 9)
                                )
                        }
                    }
                }

                secao("DESCRIÇÃO") {
                    cartao {
                        Button {
                            campoEmEdicao = .tamanho
                        } label: {
                            linha("Tamanho") {
                                Text(tamanho)
                                    .foregroundStyle(.secondary)

                                Image(systemName: "chevron.right")
                                    .accessibilityHidden(true)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)

                        Divider()

                        Button {
                            campoEmEdicao = .especie
                        } label: {
                            linha("Espécie") {
                                Text(especie)
                                    .foregroundStyle(.secondary)

                                Image(systemName: "chevron.right")
                                    .accessibilityHidden(true)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)

                        Divider()

                        linha("Descrição") {
                            TextField("Adicionar", text: $descricao)
                                .accessibilityLabel("Descrição")
                                .multilineTextAlignment(dynamicTypeSize.isAccessibilitySize ? .leading : .trailing)
                        }
                    }
                }

                (dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6)) : AnyLayout(HStackLayout())) {
                    Text("Última atualização:")
                    if !dynamicTypeSize.isAccessibilitySize {
                        Spacer()
                    }
                    Text("Hoje, 08:45")
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .accessibilityElement(children: .combine)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .safeAreaInset(edge: .bottom) {
            Button {
                campoEmEdicao = .condicao
            } label: {
                Text("Iniciar inspeção")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .frame(minHeight: 54)
                    .background(Color(red: 0, green: 0.32, blue: 0.76), in: Capsule())
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color(uiColor: .systemGroupedBackground))
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $campoEmEdicao) { campo in
            NavigationStack {
                Form {
                    switch campo {
                    case .condicao:
                        Picker("Condição", selection: $condicao) {
                            Text("Não avaliada").tag("Não avaliada")
                            Text("Boa").tag("Boa")
                            Text("Atenção").tag("Atenção")
                            Text("Ruim").tag("Ruim")
                        }

                    case .tamanho:
                        TextField("Tamanho", text: $tamanho)

                    case .especie:
                        TextField("Espécie", text: $especie)
                    }
                }
                .navigationTitle(campo.rawValue)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("OK") {
                            campoEmEdicao = nil
                        }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private var cabecalho: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: Circle())
                }
                .accessibilityLabel("Voltar")

                Spacer()
            }

            Text(dormente.nome)
                .font(.largeTitle.bold())
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
                .frame(maxWidth: .infinity)
        }
    }

    private func secao<Conteudo: View>(
        _ titulo: String,
        @ViewBuilder conteudo: () -> Conteudo
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(titulo)
                .font(.caption.weight(.semibold))
                .accessibilityAddTraits(.isHeader)
                .foregroundStyle(.secondary)

            conteudo()
        }
    }

    private func cartao<Conteudo: View>(
        @ViewBuilder conteudo: () -> Conteudo
    ) -> some View {
        VStack(spacing: 0) {
            conteudo()
        }
        .padding(.horizontal, 16)
        .background(
            Color(uiColor: .secondarySystemGroupedBackground),
            in: RoundedRectangle(cornerRadius: 20)
        )
        .shadow(color: .black.opacity(0.12), radius: 14, y: 7)
    }

    private func linha<Conteudo: View>(
        _ titulo: String,
        @ViewBuilder conteudo: () -> Conteudo
    ) -> some View {
        (dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout(spacing: 8))) {
            Text(titulo)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)

            if !dynamicTypeSize.isAccessibilitySize {
                Spacer(minLength: 8)
            }

            conteudo()
        }
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(minHeight: 48)
        .contentShape(Rectangle())
    }

    private var corDoStatus: Color {
        switch dormente.status {
        case .pending: .orange
        case .approved: .green
        case .refused: .red
        }
    }
}

#Preview {
    NavigationStack {
        EachDormenteView(dormente: Dormente.exemplos[0])
    }
}

