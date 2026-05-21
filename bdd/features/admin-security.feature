@automated @hu07
Feature: HU-07 Gestion de sedes y acceso restringido
  Como administrador
  Quiero proteger el modulo administrativo
  Para evitar accesos no autorizados

  Scenario: Acceso admin sin sesion
    Given no tengo sesion autenticada
    When consulto salud administrativa
    Then la respuesta debe tener codigo 401

  Scenario: Acceso admin con rol cliente
    Given existe un cliente confirmado para pruebas BDD
    And inicio sesion con el cliente de prueba
    When consulto salud administrativa
    Then la respuesta debe tener codigo 403
