# MidnightTrain em React Native

## 1. Diagnóstico do Swift

O app é um estoque offline em arquitetura Model–View. O SwiftData mantém lotes e dormentes relacionados. O estoque apresenta busca e filtro por condição, o lote mostra os dormentes associados, e o detalhe do dormente oferece edição completa e edição rápida. Os formulários preservam rascunhos antes da confirmação quando o Swift faz isso.

O Core NFC lê o conteúdo NDEF de texto ou URI. O código abre o lote correspondente, avisa sobre ambiguidades ou oferece um cadastro com a etiqueta preenchida. O app inicia com o lote de exemplo e três dormentes. Seus códigos anteriores continuam válidos para o lote. Não há API, autenticação, sincronização, exclusão disponível pela interface ou serviço remoto ativo. Os catálogos Xcode não referenciam arquivos de imagem próprios. O original usa fontes e símbolos do sistema.

## 2. Matriz de conversão

| Swift | Responsabilidade | React Native | Estratégia |
| --- | --- | --- | --- |
| MidnightTrainIOSApp | Abre a persistência e apresenta o estoque ou o erro | App.js | Abre SQLite, mantém o estado compartilhado e propaga dados e ações por props |
| Lote e CondicaoLote | Campos, relação, condições e identificação NFC | src/models/estoque.mjs e src/models/banco.mjs | Objetos JavaScript, enum como lista de valores, consulta das associações e tabela relacional |
| LoteCadastro | Rascunho, validação, criação em conjunto e edição | src/models/estoque.mjs, src/models/banco.mjs | Valida regras antes da gravação e insere lote e peças na mesma transação |
| Dormente e DormenteEdicao | Dados, valores padrão e edição individual | src/models/estoque.mjs, src/models/banco.mjs e DormenteEditSheet.js | Rascunho por valor, atualização da peça e timestamp quando os dados mudam |
| DormenteStore | Banco, dados iniciais e códigos anteriores | src/models/banco.mjs | Tabelas SQLite, versão de esquema e carga inicial em transação |
| StorageView | Estoque, filtro, busca, cadastro e identificação NFC | src/views/screens/StorageView.js | FlatList, barra inferior, ação de toolbar, alerta e formulário |
| LoteView | Informações e navegação às peças | src/views/screens/LoteView.js | Lista com cabeçalho e formulário de edição |
| DormenteMenu | Linha de acesso à peça | src/views/components/DormenteMenu.js | Linha acessível com ação de navegação |
| EachDormenteView | Detalhe, edição rápida e Salvar | src/views/screens/EachDormenteView.js | Cartões e modais, gravação automática na edição rápida |
| LoteEditSheet | Cadastro e edição de lote, fichas e vínculo NFC | src/views/components/LoteEditSheet.js | Modal com campos, seletores e lista virtualizada de fichas |
| DormenteEditSheet | Rascunho e confirmação de descarte | src/views/components/DormenteEditSheet.js | Estado local e alerta de confirmação |
| NFCScanButton e NFCManager | Leitura NDEF, sessão e erros | src/views/components/LeituraNFC.js, src/services/nfc.js e src/services/ndef.mjs | Sessão nativa via módulo React Native e decodificação do conteúdo |
| NavigationStack, sheet, List e Form | Rotas e apresentação | src/navigation/EstoqueNavigation.js e src/views/components/Interface.js | React Navigation Native Stack, Modal, FlatList e componentes funcionais |
| ContentView | Preview inicial “Hello, world!” sem rota no app | — | O ponto de entrada funcional abre o estoque |
| DormenteService | Exemplo de REST inteiramente comentado | — | Nenhum serviço ativo para portar |

`@State` vira `useState`, bindings viram propriedades e callbacks, e o container SwiftData vira SQLite. O estado dos registros fica em `App.js`. Navegação e UI leem esse estado, enquanto o modelo faz validações e gravações. Não há ViewModels.

## 3. Estrutura

```text
REACT/
  App.js
  index.js
  app.json
  package.json
  package-lock.json
  eslint.config.js
  src/
    models/
      estoque.mjs
      banco.mjs
    navigation/
      EstoqueNavigation.js
    services/
      nfc.js
      ndef.mjs
    views/
      screens/
        StorageView.js
        LoteView.js
        EachDormenteView.js
      components/
        Interface.js
        LeituraNFC.js
        LoteEditSheet.js
        DormenteEditSheet.js
        DormenteMenu.js
  tests/
    estoque.test.mjs
    ndef.test.mjs
```

## 4. Implementação

O código está integralmente nos arquivos acima. O banco `midnighttrain.db` tem as tabelas `lotes`, `dormentes` e `etiquetas_legadas`. Os relacionamentos usam uma chave interna estável, de modo que editar o ID exibido do lote preserve seus dormentes. A quantidade é calculada pelos registros associados. Os campos de localização copiados nos dormentes antigos são lidos pelo relacionamento na versão React Native.

SQLite foi escolhido em lugar de armazenamento chave–valor para manter chaves, unicidade, vínculos e gravações atômicas. O módulo NFC existente foi escolhido em lugar de dois módulos nativos próprios. A interface usa os componentes de cada plataforma, cores claro/escuro e ícones equivalentes aos símbolos do SwiftUI. A busca ignora caixa e acentos. Detalhes do ranking e da colação podem diferir de `localizedStandardContains` do Foundation.

## 5. Dependências e configuração

- Expo SDK 56, React 19 e React Native 0.85. As versões instaladas estão em `package-lock.json`.
- React Navigation Native Stack, screens e safe-area-context para rotas, toolbar e áreas seguras.
- Expo SQLite para armazenamento offline. Expo Dev Client permite incluir o módulo nativo NFC.
- `react-native-nfc-manager` 4.2 para leitura NDEF. O plugin gera a descrição de uso e o entitlement `TAG` no iOS, além de `android.permission.NFC` no Android.
- Expo System UI aplica a aparência do sistema no Android, e Ionicons fornece os ícones.

O Expo gera as pastas nativas pelo prebuild. Elas são ignoradas no Git. As configurações reproduzíveis ficam em `app.json`. O ID da versão React Native é distinto para permitir a instalação ao lado do app Swift. Em iPhone físico, selecione sua equipe no Xcode e use um perfil com a capacidade Near Field Communication Tag Reading para esse novo ID.

## 6. Execução

Da raiz do repositório:

```sh
cd REACT
npm ci
npm run ios
```

O comando iOS requer macOS, Xcode e CocoaPods. Para selecionar um iPhone físico, execute `npm run ios -- --device`. Se o Xcode solicitar configuração de assinatura, abra o workspace gerado em `REACT/ios` e selecione a equipe para o target do aplicativo.

Para Android, instale Android Studio, o Android SDK e um JDK compatível com o Gradle do projeto. Com um emulador ou telefone conectado, execute:

```sh
cd REACT
npm ci
npm run android
```

Com o build de desenvolvimento instalado, use `npm start` para iniciar o Metro. O leitor NFC precisa de um telefone com NFC e de uma etiqueta NDEF. Expo Go e simuladores não disponibilizam essa leitura. Para testar, grave `DORMENTE-001` em uma tag NDEF do tipo Texto e escolha **Identificar lote**. Uma etiqueta com um código novo deve oferecer **Registrar lote**.

## 7. Equivalência funcional

| Fluxo | Implementação | Status | Evidência |
| --- | --- | --- | --- |
| Abertura, carregamento, erro e tentativa novamente | App.js | Implementado | Bundle e inspeção |
| Estoque, lista vazia, busca por ID, setor, pátio e espécie, filtro por condição | StorageView.js e estoque.mjs | Implementado | Bundle e teste da busca e filtro |
| Cadastro pelo + e quantidade de 1 a 500 | LoteEditSheet.js, estoque.mjs e banco.mjs | Implementado | Testes de limites, campos obrigatórios e cadastro |
| Fichas individuais, valores herdados e relação lote–peça | LoteEditSheet.js e banco.mjs | Implementado | Testes da herança e persistência |
| Tela de lote, lista ordenada e edição do lote | LoteView.js e banco.mjs | Implementado | Bundle, teste de edição e vínculo após renomear ID |
| Detalhe da peça, atualização, edição rápida, salvar e retornar | EachDormenteView.js e banco.mjs | Implementado | Bundle, inspeção de rotas e teste da gravação |
| Edição completa da peça e descarte do rascunho | DormenteEditSheet.js | Implementado | Bundle, inspeção do formulário e teste de nome obrigatório |
| SQLite, exemplos sem duplicar e reversão de cadastro com erro | banco.mjs | Implementado | Teste SQLite real com fechamento, reabertura e falha forçada |
| Leitura NDEF e cancelamento | LeituraNFC.js, nfc.js e ndef.mjs | Implementado, validação física pendente | Testes do decodificador, prebuild e permissões geradas |
| Identificação única, múltiplas associações, etiqueta desconhecida e cadastro com código | StorageView.js e estoque.mjs | Implementado, validação física pendente | Testes de comparação, ambiguidade e cadastro; bundle |
| Associar etiqueta por leitura ou texto e impedir duplicatas | LoteEditSheet.js e banco.mjs | Implementado, validação física pendente | Teste da validação e prebuild nativo |
| Dados SwiftData do app original já instalado | Instalações separadas | Sem importação automática | O iOS mantém o banco do app original em seu próprio sandbox |
| Exclusão em cascata no modelo | banco.mjs | Implementado | Teste SQLite; o app original não oferece botão de exclusão |

## 8. Testes e limites

Comandos de validação:

```sh
npm run lint
npm test
npx expo install --check
npx expo prebuild --no-install
npx expo export --platform all
```

Os testes Node usam o SQLite real via `node:sqlite` em um banco temporário. Eles executam a lógica de domínio e as instruções SQL da aplicação. O prebuild e o bundle verificam configuração e resolução dos módulos, enquanto a leitura física exige teste em aparelhos.

Nesta máquina, o lint, a checagem de versões, quatro testes e a geração dos dois bundles passaram. A geração dos projetos nativos confirmou a permissão Android e o entitlement `TAG` no iOS. O build nativo iOS ficou pendente porque a instalação do CocoaPods encontrou dependências incompatíveis com o Ruby 2.6 do sistema. O Android SDK não estava instalado. A interface e o NFC físico ainda precisam ser executados em aparelhos.

O audit do npm sinalizou avisos nas dependências transitivas, incluindo ferramentas do Expo. O lockfile mantém a combinação que passou na checagem de compatibilidade do SDK. Uma atualização forçada mudaria a versão do Expo e exigiria revalidar os builds.

O app React Native tem seu próprio banco. O SwiftData existente permanece no app Swift. A carga inicial usa os mesmos registros de exemplo e códigos legados, e não importa dados particulares de uma instalação anterior. Para substituir o app publicado com retenção desses registros, é necessário exportar os dados com os modelos SwiftData existentes e importá-los no SQLite antes de distribuir a substituição.

Referências: [SQLite no Expo](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/), [builds de desenvolvimento](https://docs.expo.dev/develop/development-builds/introduction/) e [react-native-nfc-manager](https://github.com/revtel/react-native-nfc-manager).
