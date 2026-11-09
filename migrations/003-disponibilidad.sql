-- The existing cita table stores date and time separately.
-- Confirm historical appointment durations before using this migration on populated databases.
ALTER TABLE cita ADD COLUMN duracion INT NULL;
ALTER TABLE cita DROP INDEX idServicio_UNIQUE;
CREATE INDEX idx_cita_medico_fecha ON cita (idMedico, fecha, hora);

CREATE TABLE vacaciones_medico (
  idVacacion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  idMedico INT UNSIGNED NOT NULL,
  fechaInicio DATE NOT NULL,
  fechaFin DATE NOT NULL,
  PRIMARY KEY (idVacacion),
  KEY idx_vacaciones_medico_fechas (idMedico, fechaInicio, fechaFin),
  CONSTRAINT fk_vacaciones_medico FOREIGN KEY (idMedico) REFERENCES persona(idPersona)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
