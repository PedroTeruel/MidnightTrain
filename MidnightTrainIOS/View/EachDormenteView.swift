//
//  EachDormenteView.swift
//  MidnightTrainIOS
//
//  Created by Pedro Henrique Hossaka Teruel on 07/11/26.
//

import SwiftUI
import SwiftData

struct EachDormenteView: View {
    @Bindable var dormente: Dormente

    @Environment(\.modelContext) private var modelContext
    @State private var saveError: String?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @State private var campoEmEdicao: Campo?

    private enum Campo: String, Identifiable {
        case status = "Decisão"
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
                            Text("\(dormente.patio) - Setor \(dormente.setor)")
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
                                Text(dormente.condicao)
                                    .foregroundStyle(.secondary)

                                Image(systemName: "chevron.right")
                                    .accessibilityHidden(true)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)

                        Divider()

                        Button {
                            campoEmEdicao = .status
                        } label: {
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
                        .buttonStyle(.plain)
                    }
                }

                secao("DESCRIÇÃO") {
                    cartao {
                        Button {
                            campoEmEdicao = .tamanho
                        } label: {
                            linha("Tamanho") {
                                Text(dormente.tamanho)
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
                                Text(dormente.especie)
                                    .foregroundStyle(.secondary)

                                Image(systemName: "chevron.right")
                                    .accessibilityHidden(true)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)

                        Divider()

                        linha("Descrição") {
                            TextField("Adicionar", text: $dormente.descricao)
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
                    Text(dormente.ultimaAtualizacao, format: .dateTime.day().month().year().hour().minute())
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
        .onChange(of: [
            dormente.nome, dormente.lote, dormente.setor, dormente.patio, dormente.codigoNFC ?? "",
            dormente.status.rawValue, dormente.condicao, dormente.tamanho,
            dormente.especie, dormente.descricao
        ]) { _, _ in
            dormente.ultimaAtualizacao = .now
            salvar()
        }
        .alert("Não foi possível salvar", isPresented: Binding(
            get: { saveError != nil },
            set: { if !$0 { saveError = nil } }
        )) {
            Button("Tentar novamente") { salvar() }
            Button("OK", role: .cancel) { saveError = nil }
        } message: {
            Text(saveError ?? "")
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $campoEmEdicao) { campo in
            NavigationStack {
                Form {
                    switch campo {
                    case .status:
                        Picker("Decisão", selection: $dormente.status) {
                            ForEach(Status.allCases, id: \.self) { status in
                                Text(status.rawValue).tag(status)
                            }
                        }

                    case .condicao:
                        Picker("Condição", selection: $dormente.condicao) {
                            Text("Não avaliada").tag("Não avaliada")
                            Text("Boa").tag("Boa")
                            Text("Atenção").tag("Atenção")
                            Text("Ruim").tag("Ruim")
                        }

                    case .tamanho:
                        TextField("Tamanho", text: $dormente.tamanho)

                    case .especie:
                        TextField("Espécie", text: $dormente.especie)
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

    private func salvar() {
        do {
            try modelContext.save()
            saveError = nil
        } catch {
            saveError = error.localizedDescription
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
    let container = try! DormenteStore.makeContainer(inMemory: true)
    let dormente = try! container.mainContext.fetch(FetchDescriptor<Dormente>())[0]
    NavigationStack {
        EachDormenteView(dormente: dormente)
    }
    .modelContainer(container)
}

