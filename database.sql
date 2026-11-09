-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema test
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `test`;

-- -----------------------------------------------------
-- Schema test
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `test` DEFAULT CHARACTER SET utf8 ;
USE `test`;

-- -----------------------------------------------------
-- Table `test`.`persona`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `test`.`persona` ;

CREATE TABLE IF NOT EXISTS `test`.`persona` (
  `idPersona` INT(10) UNSIGNED NOT NULL,
  `dni` VARCHAR(9) NOT NULL,
  `nombre` VARCHAR(32) NOT NULL,
  `apellidos` VARCHAR(45) NOT NULL,
  `telefono` INT(11) NULL DEFAULT NULL,
  `contraseña` VARCHAR(45) NULL DEFAULT NULL,
  `idRolNativo` INT(11) NOT NULL,
  `fotoPerfil` VARCHAR(250) NULL,
  PRIMARY KEY (`idPersona`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `test`.`servicio`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `test`.`servicio` ;

CREATE TABLE IF NOT EXISTS `test`.`servicio` (
  `idServicio` INT(10) UNSIGNED NOT NULL,
  `servicio` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`idServicio`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `test`.`cita`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `test`.`cita` ;

CREATE TABLE IF NOT EXISTS `test`.`cita` (
  `idCita` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `fecha` DATE NULL DEFAULT NULL,
  `hora` TIME NULL DEFAULT NULL,
  `idServicio` INT(10) UNSIGNED NOT NULL,
  `historial` VARCHAR(250) NULL DEFAULT NULL,
  `idCliente` INT(10) UNSIGNED NOT NULL,
  `idMedico` INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`idCita`)
  )
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

CREATE UNIQUE INDEX `idServicio_UNIQUE` ON `test`.`cita` (`idServicio` ASC);

CREATE UNIQUE INDEX `idCita_UNIQUE` ON `test`.`cita` (`idCita` ASC);


-- -----------------------------------------------------
-- Table `test`.`historialclinico`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `test`.`historialclinico` ;

CREATE TABLE IF NOT EXISTS `test`.`historialclinico` (
  `idHistorialClinico` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `comentarios` VARCHAR(45) NOT NULL,
  `fecha` VARCHAR(45) NOT NULL,
  `hora` VARCHAR(45) NOT NULL,
  `idCliente` INT(10) UNSIGNED NOT NULL,
  `idMedico` INT(10) UNSIGNED NOT NULL,
  `idServicio` INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`idHistorialClinico`)
  )
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;



-- -----------------------------------------------------
-- Table `test`.`medico_has_servicio`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `test`.`medico_has_servicio` ;

CREATE TABLE IF NOT EXISTS `test`.`medico_has_servicio` (
  `idPersona` INT(10) UNSIGNED NOT NULL,
  `idServicio` INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`idPersona`, `idServicio`)
  )
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;



-- -----------------------------------------------------
-- Table `test`.`rol`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `test`.`rol` ;

CREATE TABLE IF NOT EXISTS `test`.`rol` (
  `idRol` INT(11) NOT NULL,
  `descripcion` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`idRol`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `test`.`persona_has_rol`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `test`.`persona_has_rol` ;

CREATE TABLE IF NOT EXISTS `test`.`persona_has_rol` (
  `idPersona` INT(10) UNSIGNED NOT NULL,
  `idRol` INT(11) NOT NULL,
  PRIMARY KEY (`idPersona`, `idRol`)
  )
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- -----------------------------------------------------
-- Data for table `test`.`persona`
-- -----------------------------------------------------
START TRANSACTION;
USE `test`;
INSERT INTO `test`.`persona` (`idPersona`, `dni`, `nombre`, `apellidos`, `telefono`, `contraseña`, `idRolNativo`, `fotoPerfil`) VALUES (0, '12345678', 'root', 'root', 123456789, 'root', 1, NULL);

COMMIT;


-- -----------------------------------------------------
-- Data for table `test`.`servicio`
-- -----------------------------------------------------
START TRANSACTION;
USE `test`;
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (1, 'Quiropodia');
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (2, 'Biomecanica');
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (3, 'Cirugia ungeal');
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (4, 'Cirugia osea');
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (5, 'Pie diabetico');
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (6, 'Podologia infantil');
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (7, 'Podologia geriatrica');
INSERT INTO `test`.`servicio` (`idServicio`, `servicio`) VALUES (8, 'Domicilio');

COMMIT;


-- -----------------------------------------------------
-- Data for table `test`.`rol`
-- -----------------------------------------------------
START TRANSACTION;
USE `test`;
INSERT INTO `test`.`rol` (`idRol`, `descripcion`) VALUES (1, 'Admin');
INSERT INTO `test`.`rol` (`idRol`, `descripcion`) VALUES (2, 'Medico');
INSERT INTO `test`.`rol` (`idRol`, `descripcion`) VALUES (3, 'Recepcionista');
INSERT INTO `test`.`rol` (`idRol`, `descripcion`) VALUES (4, 'Cliente');

COMMIT;
