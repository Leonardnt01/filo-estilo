@manual @hu06 @hu08 @hu09 @hu10
Feature: HU-06 a HU-10 Flujos de negocio pendientes de automatizacion completa
  Como equipo de calidad
  Queremos mantener trazabilidad BDD de todas las historias
  Para completar cobertura funcional del backlog

  Scenario: HU-06 Cancelacion y reprogramacion de cita
    Given un cliente tiene una cita futura activa
    When solicita cancelar o reprogramar la cita
    Then el sistema actualiza estado y disponibilidad segun reglas de negocio

  Scenario: HU-08 Gestion de servicios por sede
    Given un administrador autenticado en panel
    When crea, edita o desactiva un servicio por sede
    Then el catalogo publico refleja los cambios correctamente

  Scenario: HU-09 Gestion de barberos y horarios
    Given un administrador autenticado en panel
    When configura disponibilidad y bloqueos de barbero
    Then los horarios reservables se actualizan para clientes

  Scenario: HU-10 Gestion administrativa de citas
    Given un administrador autenticado en panel
    When filtra y actualiza estados de citas por sede
    Then el sistema conserva consistencia y trazabilidad de atenciones
