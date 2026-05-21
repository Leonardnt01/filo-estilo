@automated @hu03 @hu04 @hu05
Feature: HU-03 HU-04 HU-05 Catalogo, reserva y mis citas
  Como cliente
  Quiero ver servicios y gestionar reservas
  Para organizar mis atenciones

  Scenario: HU-03 Catalogo por sede
    When consulto el catalogo general
    Then la respuesta debe tener codigo 200
    And el catalogo debe incluir al menos una sede
    When consulto el catalogo de la primera sede
    Then la respuesta debe tener codigo 200
    And el catalogo filtrado solo contiene elementos de esa sede

  Scenario: HU-04 Reserva duplicada bloqueada
    Given existe un cliente confirmado para pruebas BDD
    And inicio sesion con el cliente de prueba
    And encuentro un horario reservable
    When creo una reserva con el horario encontrado
    Then la respuesta debe tener codigo 201
    And la respuesta JSON debe tener "item.status" igual a "pending"
    When intento crear la misma reserva nuevamente
    Then la respuesta debe tener codigo 409

  Scenario: HU-05 Mis citas requiere sesion
    Given no tengo sesion autenticada
    When consulto mis citas
    Then la respuesta debe tener codigo 401
