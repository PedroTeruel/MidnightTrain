#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/CPTM-SwiftDataTests.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT
xcrun swiftc -parse-as-library \
    MidnightTrainIOS/Model/Dormente.swift \
    MidnightTrainIOS/Model/DormenteStore.swift \
    MidnightTrainIOS/Model/DormenteEdicao.swift \
    Tests/SwiftDataPersistenceTests.swift \
    -o "$test_dir/persistence-tests"
"$test_dir/persistence-tests" write "$test_dir/dormentes.store"
"$test_dir/persistence-tests" read "$test_dir/dormentes.store"
