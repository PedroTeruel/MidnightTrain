#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/CPTM-SwiftDataTests.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT
xcrun swiftc -parse-as-library -module-name main \
    MidnightTrainIOS/Model/Dormente.swift \
    MidnightTrainIOS/Model/DormenteStore.swift \
    MidnightTrainIOS/Model/DormenteEdicao.swift \
    MidnightTrainIOS/Model/Lote.swift \
    MidnightTrainIOS/Model/LoteCadastro.swift \
    Tests/SwiftDataPersistenceTests.swift \
    -o "$test_dir/persistence-tests"
"$test_dir/persistence-tests" write "$test_dir/dormentes.store"
"$test_dir/persistence-tests" read "$test_dir/dormentes.store"

# Create a real store using the app schema immediately before lot support.
git show 1a1dbdec022238033db3affe6469e4b18cbe105e:MidnightTrainIOS/Model/Dormente.swift > "$test_dir/LegacyDormente.swift"
cat > "$test_dir/WriteLegacyStore.swift" <<'SWIFT'
import Foundation
import SwiftData

@main
struct WriteLegacyStore {
    @MainActor
    static func main() throws {
        let url = URL(fileURLWithPath: CommandLine.arguments[1])
        let configuration = ModelConfiguration(url: url, cloudKitDatabase: .none)
        let container = try ModelContainer(for: Dormente.self, configurations: configuration)
        let records = Dormente.exemplos
        records[0].nome = "Dormente legado"
        records[0].condicao = "Boa"
        for record in records { container.mainContext.insert(record) }
        try container.mainContext.save()
    }
}
SWIFT
xcrun swiftc -parse-as-library -module-name main \
    "$test_dir/LegacyDormente.swift" "$test_dir/WriteLegacyStore.swift" \
    -o "$test_dir/write-legacy"
"$test_dir/write-legacy" "$test_dir/legado.store"
"$test_dir/persistence-tests" migration "$test_dir/legado.store"
