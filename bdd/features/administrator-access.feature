@automated @admin @hu07
Feature: Administrador - acceso al modulo administrativo
  Como administrador
  Quiero acceder al panel 
  Para gestionar la operacion del sistema

  Scenario: Acceso admin sin sesion
    Given no tengo sesion autenticada
    When consulto salud administrativa
    Then la respuesta debe tener codigo 401

  Scenario: Acceso admin con rol cliente
    Given existe un cliente confirmado para pruebas BDD
    And inicio sesion con el cliente de prueba
    When consulto salud administrativa
    Then la respuesta debe tener codigo 403

  Scenario: Acceso admin con rol administrador
    Given existe un administrador confirmado para pruebas BDD
    And inicio sesion con el administrador de prueba
    When consulto salud administrativa
    Then la respuesta debe tener codigo 200

