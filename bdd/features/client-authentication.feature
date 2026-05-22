@automated @client @hu01 @hu02
Feature: Cliente - autenticacion
  Como cliente
  Quiero registrarme e iniciar sesion
  Para gestionar mis citas

  Scenario: HU-01 Registro exitoso
    Given genero un cliente de prueba
    When registro el cliente de prueba
    Then la respuesta debe tener codigo 201
    And la respuesta JSON debe tener "ok" igual a "true"

  Scenario: HU-01 Correo ya registrado
    Given existe un cliente de prueba registrado
    When intento registrar nuevamente el mismo cliente
    Then la respuesta debe tener codigo 409

  Scenario: HU-02 Inicio de sesion exitoso
    Given existe un cliente confirmado para pruebas BDD
    When inicio sesion con el cliente de prueba
    Then la respuesta debe tener codigo 200

  Scenario: HU-02 Credenciales incorrectas
    Given existe un cliente confirmado para pruebas BDD
    When inicio sesion con password incorrecta
    Then la respuesta debe tener codigo 401

  Scenario: HU-02 Cierre de sesion
    Given existe un cliente confirmado para pruebas BDD
    And inicio sesion con el cliente de prueba
    When cierro la sesion actual
    Then la respuesta debe tener codigo 200

