-- Ejecutar antes de desplegar el backend que utiliza hash de contraseñas.
-- Conserva los valores existentes; se convertirán tras un inicio de sesión correcto.
ALTER TABLE persona MODIFY COLUMN password VARCHAR(255) NULL DEFAULT NULL;
