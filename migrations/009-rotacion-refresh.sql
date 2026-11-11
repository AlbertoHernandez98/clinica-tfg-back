ALTER TABLE auth_refresh_session
  ADD COLUMN revokedAt DATETIME NULL DEFAULT NULL;

CREATE TABLE auth_refresh_used_token (
  tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  idSesion BIGINT UNSIGNED NOT NULL,
  usedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tokenHash),
  KEY idx_refresh_used_session (idSesion),
  CONSTRAINT fk_refresh_used_session FOREIGN KEY (idSesion)
    REFERENCES auth_refresh_session (idSesion) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8;
