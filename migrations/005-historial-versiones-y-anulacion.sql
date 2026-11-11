-- CU-016/CU-017: conserva instantáneas de cada anotación antes de editarla o anularla.
-- Ejecutar después de 004-historial-clinico.sql durante una ventana de mantenimiento.
ALTER TABLE historialclinico
  ADD COLUMN anulada TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE historialclinicohistorico (
  idVersionHistorial INT UNSIGNED NOT NULL AUTO_INCREMENT,
  idHistorialClinico INT UNSIGNED NOT NULL,
  comentarios TEXT NOT NULL,
  fecha VARCHAR(45) NULL,
  hora VARCHAR(45) NULL,
  idMedico INT UNSIGNED NULL,
  idServicio INT UNSIGNED NOT NULL,
  idCita INT UNSIGNED NULL,
  tipoOperacion ENUM('EDICION', 'ANULACION') NOT NULL,
  motivo VARCHAR(1000) NOT NULL,
  idUsuario INT UNSIGNED NOT NULL,
  fechaOperacion DATETIME NOT NULL,
  PRIMARY KEY (idVersionHistorial),
  INDEX idx_historial_historico_entrada (idHistorialClinico, idVersionHistorial),
  INDEX idx_historial_historico_usuario (idUsuario, fechaOperacion)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8;
