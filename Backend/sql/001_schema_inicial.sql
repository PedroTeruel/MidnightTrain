
-- MidnightTrain | Migracao 001: estrutura inicial
-- Banco: midnighttrain
-- Criacao das tabelas fundamentais do sistema.
-- Nao inclui dados de teste.

CREATE DATABASE IF NOT EXISTS midnighttrain
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE midnighttrain;

-- Funcionarios e autenticacao
CREATE TABLE funcionarios (
    id CHAR(36) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role ENUM('EMPLOYEE', 'MANAGER') NOT NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- Lotes de dormentes
CREATE TABLE lotes (
    chave BIGINT NOT NULL AUTO_INCREMENT,
    id VARCHAR(64) NOT NULL,
    setor VARCHAR(100) NOT NULL,
    patio VARCHAR(100) NOT NULL,
    tamanho VARCHAR(100) NOT NULL,
    especies VARCHAR(255) NOT NULL,
    condicao ENUM('Pendente', 'Aprovado', 'Reprovado') NOT NULL,
    descricao TEXT NOT NULL,
    codigoNFC VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (chave),
    UNIQUE KEY id (id),
    UNIQUE KEY codigoNFC (codigoNFC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- Dormentes pertencentes aos lotes
CREATE TABLE dormentes (
    id VARCHAR(36) NOT NULL,
    loteChave BIGINT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    condicao VARCHAR(100) NOT NULL,
    tamanho VARCHAR(100) NOT NULL,
    especie VARCHAR(120) NOT NULL,
    ultimaAtualizacao DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_dormentes_lote (loteChave),
    CONSTRAINT fk_dormente_lote
        FOREIGN KEY (loteChave)
        REFERENCES lotes (chave)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- Codigos NFC antigos associados aos lotes
CREATE TABLE etiquetas_legadas (
    loteChave BIGINT NOT NULL,
    codigo VARCHAR(255) NOT NULL,
    PRIMARY KEY (loteChave, codigo),
    CONSTRAINT fk_etiqueta_lote
        FOREIGN KEY (loteChave)
        REFERENCES lotes (chave)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
