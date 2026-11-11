CREATE TABLE auth_refresh_session (
  idSesion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  idPersona INT UNSIGNED NOT NULL,
  tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idSesion),
  UNIQUE KEY uq_refresh_token (tokenHash),
  KEY idx_refresh_persona (idPersona),
  KEY idx_refresh_expiry (expiresAt)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8;
