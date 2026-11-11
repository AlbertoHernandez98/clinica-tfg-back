CREATE TABLE auditoria_historial (
  idAuditoria BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  idUsuario INT UNSIGNED NOT NULL,
  rolUsuario INT NOT NULL,
  operacion ENUM('CONSULTA', 'ALTA', 'EDICION', 'ANULACION') NOT NULL,
  resultado ENUM('PERMITIDO', 'DENEGADO') NOT NULL,
  idPaciente INT UNSIGNED NULL,
  idHistorialClinico INT UNSIGNED NULL,
  PRIMARY KEY (idAuditoria),
  KEY idx_auditoria_fecha (fecha, idAuditoria),
  KEY idx_auditoria_paciente (idPaciente, idAuditoria),
  KEY idx_auditoria_usuario (idUsuario, idAuditoria)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8;
