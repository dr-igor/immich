import { ForkPersonController } from 'src/fork/fork-person.controller';
import { ForkPersonService } from 'src/fork/fork-person.service';
import { LoggingRepository } from 'src/repositories/logging.repository';
import request from 'supertest';
import { factory } from 'test/small.factory';
import { automock, ControllerContext, controllerSetup } from 'test/utils';

describe(ForkPersonController.name, () => {
  let ctx: ControllerContext;
  const service = {
    getAllPeople: vi.fn(),
    updatePersonMeta: vi.fn(),
    enrichPerson: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await controllerSetup(ForkPersonController, [
      { provide: ForkPersonService, useValue: service },
      { provide: LoggingRepository, useValue: automock(LoggingRepository, { strict: false }) },
    ]);
    return () => ctx.close();
  });

  beforeEach(() => {
    service.getAllPeople.mockReset();
    service.updatePersonMeta.mockReset();
    service.enrichPerson.mockReset();
    service.getAllPeople.mockResolvedValue({ total: 0, hidden: 0, people: [], hasNextPage: false });
    ctx.reset();
  });

  describe('PUT /fork/people/:id/meta', () => {
    it('forwards the body to the service and returns the response', async () => {
      const personId = factory.uuid();
      const tagId = factory.uuid();
      const response = { id: personId, note: 'hi', tags: [] };
      service.updatePersonMeta.mockResolvedValue(response);

      const { status, body } = await request(ctx.getHttpServer())
        .put(`/fork/people/${personId}/meta`)
        .send({ note: 'hi', tagIds: [tagId] });

      expect(status).toBe(200);
      expect(body).toEqual(response);
      expect(service.updatePersonMeta).toHaveBeenCalledWith(undefined, personId, { note: 'hi', tagIds: [tagId] });
    });
  });

  describe('GET /fork/people', () => {
    it('accepts multiple tagIds query values and forwards them as an array', async () => {
      const tagA = factory.uuid();
      const tagB = factory.uuid();
      const { status } = await request(ctx.getHttpServer())
        .get('/fork/people')
        .query(`page=1&withHidden=true&tagIds=${tagA}&tagIds=${tagB}`);
      expect(status).toBe(200);
      expect(service.getAllPeople).toHaveBeenCalledWith(undefined, expect.objectContaining({ tagIds: [tagA, tagB] }));
    });

    it('accepts a single tagIds query value and passes it as a one-element array to the service', async () => {
      const tagId = factory.uuid();
      const { status } = await request(ctx.getHttpServer())
        .get('/fork/people')
        .query({ page: 1, withHidden: true, tagIds: tagId });
      expect(status).toBe(200);
      expect(service.getAllPeople).toHaveBeenCalledWith(undefined, expect.objectContaining({ tagIds: [tagId] }));
    });
  });
});
