-- Conserva las anotaciones anteriores, ampliando el texto y permitiendo vincular una cita.
ALTER TABLE historialclinico
  MODIFY COLUMN comentarios TEXT NOT NULL,
  ADD COLUMN idCita INT UNSIGNED NULL;
