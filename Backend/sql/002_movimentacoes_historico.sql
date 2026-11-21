-- MidnightTrain | Migracao 002: estoque centralizado e KPIs
-- Destino: MySQL Server 26.10 | Banco: midnighttrain
-- Pre-requisito: backup do banco e quatro tabelas existentes:
--   funcionarios, lotes, dormentes, etiquetas_legadas.
-- EXECUTAR SOMENTE UMA VEZ. O ALTER TABLE nao e idempotente.
-- Nao apaga tabelas nem registros existentes.
-- As novas operacoes devem ser implementadas na API Node.js.

USE midnighttrain;

-- Cadastro padronizado dos locais fisicos de armazenamento.
CREATE TABLE locais (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patio VARCHAR(100) NOT NULL,
    setor VARCHAR(100) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_locais_patio_setor (patio, setor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Nao confundir condicao fisica (dormentes.condicao) com situacao em estoque.
-- NAO_INFORMADO evita presumir que eventuais registros antigos estao fisicamente em estoque.
ALTER TABLE dormentes
    ADD COLUMN local_id BIGINT NULL AFTER loteChave,
    ADD COLUMN situacao_estoque ENUM(
        'NAO_INFORMADO', 'EM_ESTOQUE', 'RETIRADO', 'EXTRAVIADO'
    ) NOT NULL DEFAULT 'NAO_INFORMADO' AFTER condicao,
    ADD COLUMN extraviado_em DATETIME(3) NULL AFTER situacao_estoque,
    ADD INDEX idx_dormentes_local (local_id),
    ADD INDEX idx_dormentes_situacao (situacao_estoque),
    ADD INDEX idx_dormentes_condicao (condicao),
    ADD INDEX idx_dormentes_ultima_atualizacao (ultimaAtualizacao),
    ADD CONSTRAINT fk_dormentes_local
        FOREIGN KEY (local_id) REFERENCES locais(id) ON DELETE RESTRICT,
    ADD CONSTRAINT chk_dormentes_extravio CHECK (
        (situacao_estoque = 'EXTRAVIADO' AND extraviado_em IS NOT NULL)
        OR (situacao_estoque <> 'EXTRAVIADO' AND extraviado_em IS NULL)
    );

-- Cada transferencia, entrada ou saida corresponde a um registro proprio.
-- Apenas movimentos CONCLUIDOS devem alterar situacao_estoque e local_id.
-- A API deve gravar movimento + atualizacao do dormente na mesma transacao.
CREATE TABLE movimentacoes (
    id CHAR(36) NOT NULL,
    dormente_id VARCHAR(36) NOT NULL,
    tipo ENUM('ENTRADA', 'SAIDA', 'INTERNA') NOT NULL,
    origem_local_id BIGINT NULL,
    destino_local_id BIGINT NULL,
    status ENUM('PENDENTE', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    registrada_por CHAR(36) NOT NULL,
    iniciada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    prazo_previsto_em DATETIME(3) NULL,
    concluida_em DATETIME(3) NULL,
    observacao VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_mov_dormente_data (dormente_id, iniciada_em),
    KEY idx_mov_status_data (status, iniciada_em),
    KEY idx_mov_tipo_data (tipo, iniciada_em),
    KEY idx_mov_usuario_data (registrada_por, iniciada_em),
    CONSTRAINT fk_mov_dormente FOREIGN KEY (dormente_id)
        REFERENCES dormentes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mov_origem FOREIGN KEY (origem_local_id)
        REFERENCES locais(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mov_destino FOREIGN KEY (destino_local_id)
        REFERENCES locais(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mov_usuario FOREIGN KEY (registrada_por)
        REFERENCES funcionarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_mov_tempos CHECK (
        concluida_em IS NULL OR concluida_em >= iniciada_em
    ),
    CONSTRAINT chk_mov_status CHECK (
        (status = 'CONCLUIDA' AND concluida_em IS NOT NULL)
        OR (status <> 'CONCLUIDA' AND concluida_em IS NULL)
    ),
    CONSTRAINT chk_mov_locais CHECK (
        (tipo = 'ENTRADA' AND destino_local_id IS NOT NULL AND origem_local_id IS NULL)
        OR (tipo = 'SAIDA' AND origem_local_id IS NOT NULL AND destino_local_id IS NULL)
        OR (tipo = 'INTERNA' AND origem_local_id IS NOT NULL
            AND destino_local_id IS NOT NULL AND origem_local_id <> destino_local_id)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- KPI: tempo medio para LOCALIZAR FISICAMENTE um dormente, e nao tempo da consulta SQL.
CREATE TABLE buscas_localizacao (
    id CHAR(36) NOT NULL,
    dormente_id VARCHAR(36) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    iniciada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    finalizada_em DATETIME(3) NULL,
    resultado ENUM('EM_ANDAMENTO', 'ENCONTRADO', 'NAO_ENCONTRADO', 'CANCELADA')
        NOT NULL DEFAULT 'EM_ANDAMENTO',
    PRIMARY KEY (id),
    KEY idx_buscas_inicio_resultado (iniciada_em, resultado),
    KEY idx_buscas_dormente (dormente_id),
    CONSTRAINT fk_busca_dormente FOREIGN KEY (dormente_id)
        REFERENCES dormentes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_busca_usuario FOREIGN KEY (usuario_id)
        REFERENCES funcionarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_buscas_tempo CHECK (
        finalizada_em IS NULL OR finalizada_em >= iniciada_em
    ),
    CONSTRAINT chk_buscas_resultado CHECK (
        (resultado = 'EM_ANDAMENTO' AND finalizada_em IS NULL)
        OR (resultado <> 'EM_ANDAMENTO' AND finalizada_em IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Historico generico: a API registra alteracoes de lotes e dormentes.
-- entidade_id nao possui FK deliberadamente: historico deve sobreviver a eventual
-- arquivamento/exclusao logica do registro de origem.
CREATE TABLE historico_alteracoes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    entidade ENUM('LOTE', 'DORMENTE') NOT NULL,
    entidade_id VARCHAR(64) NOT NULL,
    acao VARCHAR(64) NOT NULL,
    dados_anteriores JSON NULL,
    dados_novos JSON NULL,
    usuario_id CHAR(36) NOT NULL,
    registrado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_hist_entidade (entidade, entidade_id, registrado_em),
    KEY idx_hist_data (registrado_em),
    CONSTRAINT fk_hist_usuario FOREIGN KEY (usuario_id)
        REFERENCES funcionarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Inspecao final. Esperado: 8 tabelas e novas colunas em dormentes.
SHOW TABLES;
SHOW COLUMNS FROM dormentes;
