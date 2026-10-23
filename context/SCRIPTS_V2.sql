-- 1. Criação de Papéis e Usuários (Decano, Diretor, Coordenador, Professor)
CREATE TABLE Papel (
    Cod_Papel INT NOT NULL,
    Nome_Papel VARCHAR(50) NOT NULL, 
    CONSTRAINT PK_Papel PRIMARY KEY (Cod_Papel)
);

CREATE TABLE Usuario (
    Cod_Usuario INT NOT NULL,
    Nome VARCHAR(100) NOT NULL,
    Cod_Papel INT NOT NULL,
    CONSTRAINT PK_Usuario PRIMARY KEY (Cod_Usuario),
    CONSTRAINT FK_Usuario_Papel FOREIGN KEY (Cod_Papel) REFERENCES Papel(Cod_Papel)
);

-- 2. Entidade Escola/Programa (Dona das disciplinas)
CREATE TABLE Escola_Programa (
    Cod_Escola INT NOT NULL,
    Nome VARCHAR(100) NOT NULL,
    Cod_Usuario_Decano INT, 
    CONSTRAINT PK_Escola PRIMARY KEY (Cod_Escola),
    CONSTRAINT FK_Escola_Decano FOREIGN KEY (Cod_Usuario_Decano) REFERENCES Usuario(Cod_Usuario)
);

-- 3. Entidades Físicas (Prédio e Sala)
CREATE TABLE Predio (
    Cod_Predio INT NOT NULL,
    Nome VARCHAR(100) NOT NULL,
    Abreviacao VARCHAR(10),
    Endereco VARCHAR(255),
    CONSTRAINT PK_Predio PRIMARY KEY (Cod_Predio)
);

CREATE TABLE Sala (
    Cod_Sala INT NOT NULL,
    Capacidade INT NOT NULL,
    Cod_Predio INT NOT NULL,
    CONSTRAINT PK_Sala PRIMARY KEY (Cod_Sala),
    CONSTRAINT FK_Sala_Predio FOREIGN KEY (Cod_Predio) REFERENCES Predio(Cod_Predio)
);

-- 4. Curso
CREATE TABLE Curso (
    Cod_Curso INT NOT NULL,
    Nome VARCHAR(100) NOT NULL,
    Departamento VARCHAR(100),
    Cod_Usuario_Coordenador INT, 
    CONSTRAINT PK_Curso PRIMARY KEY (Cod_Curso),
    CONSTRAINT FK_Curso_Coordenador FOREIGN KEY (Cod_Usuario_Coordenador) REFERENCES Usuario(Cod_Usuario)
);

-- 5. Espaço na Grade (Períodos de aula)
CREATE TABLE Espaco_Grade (
    Cod_Espaco INT NOT NULL,
    Dia_Semana VARCHAR(20) NOT NULL,
    Horario_Inicio TIME NOT NULL,
    Horario_Fim TIME NOT NULL,
    CONSTRAINT PK_Espaco_Grade PRIMARY KEY (Cod_Espaco)
);

-- 6. Disciplina
CREATE TABLE Disciplina (
    Cod_Disciplina INT NOT NULL,
    Nome VARCHAR(100) NOT NULL,
    Periodo VARCHAR(20),
    Vagas_Oferecidas INT,
    Cod_Curso INT NOT NULL,
    Cod_Escola INT NOT NULL, 
    Cod_Usuario_Professor INT, 
    CONSTRAINT PK_Disciplina PRIMARY KEY (Cod_Disciplina),
    CONSTRAINT FK_Disciplina_Curso FOREIGN KEY (Cod_Curso) REFERENCES Curso(Cod_Curso),
    CONSTRAINT FK_Disciplina_Escola FOREIGN KEY (Cod_Escola) REFERENCES Escola_Programa(Cod_Escola),
    CONSTRAINT FK_Disciplina_Professor FOREIGN KEY (Cod_Usuario_Professor) REFERENCES Usuario(Cod_Usuario)
);

-- 7. Grade Horária (Relacionamento N:M:1 para Disciplina, Espaço e Sala)
CREATE TABLE Grade_Horaria (
    Cod_Grade INT NOT NULL,
    Cod_Disciplina INT NOT NULL,
    Cod_Espaco INT NOT NULL,
    Cod_Sala INT NOT NULL,
    CONSTRAINT PK_Grade_Horaria PRIMARY KEY (Cod_Grade),
    CONSTRAINT FK_Grade_Disciplina FOREIGN KEY (Cod_Disciplina) REFERENCES Disciplina(Cod_Disciplina),
    CONSTRAINT FK_Grade_Espaco FOREIGN KEY (Cod_Espaco) REFERENCES Espaco_Grade(Cod_Espaco),
    CONSTRAINT FK_Grade_Sala FOREIGN KEY (Cod_Sala) REFERENCES Sala(Cod_Sala)
);