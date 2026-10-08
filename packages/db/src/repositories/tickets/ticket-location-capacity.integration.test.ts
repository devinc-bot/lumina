import { afterAll, describe, expect, test } from 'vitest'
import { TICKET_CAPACITY_RESULT, TICKET_STATUS, type TicketUpsertInput } from '@repo/types'
import { loadTestDatabaseEnv } from '../../config/env.loader.ts'

const testDatabaseUrl = process.env.DATABASE_TEST_URL
const integration = testDatabaseUrl
  ? await (async () => {
      const { DATABASE_TEST_URL } = loadTestDatabaseEnv()
      process.env.DATABASE_URL = DATABASE_TEST_URL
      const [{ Pool }, { closeDatabaseConnection }, repositories] = await Promise.all([
        import('pg'),
        import('../../client.ts'),
        import('./index.ts'),
      ])
      return {
        closeDatabaseConnection,
        pool: new Pool({ connectionString: DATABASE_TEST_URL }),
        repositories,
      }
    })()
  : null

if (integration) {
  describe('ticket location capacity transactions', () => {
    const { closeDatabaseConnection, pool, repositories } = integration
    let fixtureSequence = 0

    async function createFixture(capacityA = '100', capacityB = '100') {
      const sequence = ++fixtureSequence
      const owner = await pool.query<{ id: number }>(
        "insert into owners (name, last_name, phone) values ('Capacity', 'Test', '000') returning id"
      )
      const ownerId = owner.rows[0]?.id
      if (!ownerId) throw new Error('Owner fixture insertion failed')

      const organization = await pool.query<{ id: number }>(
        'insert into organizations (name, slug) values ($1, $2) returning id',
        [`Capacity test ${sequence}`, `capacity-test-${sequence}`]
      )
      const organizationId = organization.rows[0]?.id
      if (!organizationId) throw new Error('Organization fixture insertion failed')

      const locationA = await pool.query<{ id: number }>(
        'insert into locations (name, capacity, owner_id) values ($1, $2, $3) returning id',
        [`Capacity location A ${sequence}`, capacityA, ownerId]
      )
      const locationB = await pool.query<{ id: number }>(
        'insert into locations (name, capacity, owner_id) values ($1, $2, $3) returning id',
        [`Capacity location B ${sequence}`, capacityB, ownerId]
      )
      const locationAId = locationA.rows[0]?.id
      const locationBId = locationB.rows[0]?.id
      if (!locationAId || !locationBId) throw new Error('Location fixture insertion failed')

      const createEvent = async (locationId: number, suffix: string) => {
        const event = await pool.query<{ id: number }>(
          `insert into events
            (location_id, organization_id, name, slug, description, starts_at, ends_at)
           values ($1, $2, $3, $4, 'Capacity test event', now(), now() + interval '1 day')
           returning id`,
          [
            locationId,
            organizationId,
            `Capacity event ${suffix} ${sequence}`,
            `capacity-${suffix}-${sequence}`,
          ]
        )
        const eventId = event.rows[0]?.id
        if (!eventId) throw new Error('Event fixture insertion failed')
        return eventId
      }

      const eventAId = await createEvent(locationAId, 'a')
      const eventBId = await createEvent(locationBId, 'b')
      const ticketType = await pool.query<{ id: number }>(
        'insert into ticket_types (name) values ($1) returning id',
        [`Capacity type ${sequence}`]
      )
      const ticketTypeId = ticketType.rows[0]?.id
      if (!ticketTypeId) throw new Error('Ticket type fixture insertion failed')

      return {
        ownerId,
        organizationId,
        locationIds: [locationAId, locationBId],
        eventIds: [eventAId, eventBId],
        ticketTypeId,
      }
    }

    async function deleteFixture(fixture: Awaited<ReturnType<typeof createFixture>>) {
      await pool.query('delete from tickets where event_id = any($1::int[])', [fixture.eventIds])
      await pool.query('delete from events where id = any($1::int[])', [fixture.eventIds])
      await pool.query('delete from locations where id = any($1::int[])', [fixture.locationIds])
      await pool.query('delete from organizations where id = $1', [fixture.organizationId])
      await pool.query('delete from owners where id = $1', [fixture.ownerId])
      await pool.query('delete from ticket_types where id = $1', [fixture.ticketTypeId])
    }

    function ticketInput(
      eventId: number,
      ticketTypeId: number,
      quantity: number
    ): TicketUpsertInput {
      return {
        eventId,
        ticketTypeId,
        quantity,
        price: 100,
        description: 'Configured capacity test ticket',
        status: TICKET_STATUS.INACTIVE,
        saleStartsAt: null,
        saleEndsAt: null,
      }
    }

    async function createTicket(eventId: number, ticketTypeId: number, quantity: number) {
      const result = await repositories.upsertTicketWithinEventCapacity(
        ticketInput(eventId, ticketTypeId, quantity)
      )
      if (result.status !== TICKET_CAPACITY_RESULT.SAVED) {
        throw new Error('Expected capacity-checked ticket creation')
      }
      return result.ticket.ticket
    }

    test('counts inactive configured tickets and leaves storage unchanged when capacity is exceeded', async () => {
      const fixture = await createFixture('100')
      try {
        await createTicket(fixture.eventIds[0]!, fixture.ticketTypeId, 91)

        const result = await repositories.upsertTicketWithinEventCapacity(
          ticketInput(fixture.eventIds[0]!, fixture.ticketTypeId, 10)
        )

        expect(result).toEqual({ status: TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED })
        const stored = await pool.query<{ total: string }>(
          'select coalesce(sum(quantity), 0)::text as total from tickets where event_id = $1',
          [fixture.eventIds[0]]
        )
        expect(stored.rows[0]?.total).toBe('91')
      } finally {
        await deleteFixture(fixture)
      }
    })

    test('serializes concurrent ticket creation on the event row and allows an exact-capacity total', async () => {
      const fixture = await createFixture('100')
      try {
        const eventId = fixture.eventIds[0]!
        const competingResults = await Promise.all([
          repositories.upsertTicketWithinEventCapacity(
            ticketInput(eventId, fixture.ticketTypeId, 60)
          ),
          repositories.upsertTicketWithinEventCapacity(
            ticketInput(eventId, fixture.ticketTypeId, 60)
          ),
        ])
        expect(
          competingResults.filter((result) => result.status === TICKET_CAPACITY_RESULT.SAVED)
        ).toHaveLength(1)
        expect(
          competingResults.filter(
            (result) => result.status === TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED
          )
        ).toHaveLength(1)

        await pool.query('delete from tickets where event_id = $1', [eventId])

        const exactCapacityResults = await Promise.all([
          repositories.upsertTicketWithinEventCapacity(
            ticketInput(eventId, fixture.ticketTypeId, 60)
          ),
          repositories.upsertTicketWithinEventCapacity(
            ticketInput(eventId, fixture.ticketTypeId, 40)
          ),
        ])
        expect(
          exactCapacityResults.every((result) => result.status === TICKET_CAPACITY_RESULT.SAVED)
        ).toBe(true)

        const overLimitResult = await repositories.upsertTicketWithinEventCapacity(
          ticketInput(eventId, fixture.ticketTypeId, 1)
        )
        expect(overLimitResult.status).toBe(TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED)
      } finally {
        await deleteFixture(fixture)
      }
    })

    test('checks an edit against the destination event and excludes its previous quantity', async () => {
      const fixture = await createFixture('100', '100')
      try {
        const oldTicket = await createTicket(fixture.eventIds[0]!, fixture.ticketTypeId, 50)
        await createTicket(fixture.eventIds[1]!, fixture.ticketTypeId, 90)

        const accepted = await repositories.upsertTicketWithinEventCapacity(
          ticketInput(fixture.eventIds[1]!, fixture.ticketTypeId, 10),
          oldTicket.documentId
        )
        expect(accepted.status).toBe(TICKET_CAPACITY_RESULT.SAVED)

        const rejected = await repositories.upsertTicketWithinEventCapacity(
          ticketInput(fixture.eventIds[1]!, fixture.ticketTypeId, 11),
          oldTicket.documentId
        )
        expect(rejected.status).toBe(TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED)

        const stored = await pool.query<{ eventId: number; quantity: number }>(
          'select event_id as "eventId", quantity from tickets where document_id = $1',
          [oldTicket.documentId]
        )
        expect(stored.rows[0]).toEqual({ eventId: fixture.eventIds[1], quantity: 10 })
      } finally {
        await deleteFixture(fixture)
      }
    })

    afterAll(async () => {
      await pool.end()
      await closeDatabaseConnection()
    })
  })
} else {
  describe('ticket location capacity transactions', () => {
    test('requires DATABASE_TEST_URL', () => {})
  })
}
