-- Preserve existing zero-valued identifiers while enabling generated IDs.
SET @previous_sql_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = CONCAT_WS(',', NULLIF(@@SESSION.sql_mode, ''), 'NO_AUTO_VALUE_ON_ZERO');
ALTER TABLE persona MODIFY idPersona INT(10) UNSIGNED NOT NULL AUTO_INCREMENT;
SET SESSION sql_mode = @previous_sql_mode;
