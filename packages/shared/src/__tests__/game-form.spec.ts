import { describe, expect, it } from 'vitest';
import { initialGameForm, type GameDto } from '../index';

const game: GameDto = {
  id: 'g1',
  organizerId: 'u1',
  title: 'Futebolada',
  location: 'Pavilhão',
  startsAt: '2030-01-10T21:00:00.000Z',
  slots: 12,
  subs: 0,
  totalPriceCents: 4250,
  inviteCode: 'abcdef123456',
  status: 'open',
  createdAt: '2030-01-01T10:00:00.000Z',
};

describe('initialGameForm', () => {
  it('jogo novo: valores por defeito (10 vagas, 2 suplentes, 30 €)', () => {
    expect(initialGameForm()).toEqual({
      title: '',
      location: '',
      startsAt: '',
      slots: 10,
      subs: 2,
      totalEuros: 30,
    });
  });

  it('editar: os valores do jogo, com a data na hora de Portugal', () => {
    expect(initialGameForm(game)).toEqual({
      title: 'Futebolada',
      location: 'Pavilhão',
      startsAt: '2030-01-10T21:00',
      slots: 12,
      subs: 0,
      totalEuros: 42.5,
    });
  });

  it('rascunho da IA: o que veio, e o resto por defeito', () => {
    expect(
      initialGameForm(null, { location: 'Romaniz', startsAt: '2030-07-10T20:00:00.000Z' }),
    ).toEqual({
      title: '',
      location: 'Romaniz',
      startsAt: '2030-07-10T21:00', // verão: UTC+1
      slots: 10,
      subs: 2,
      totalEuros: 30,
    });
  });

  it('a editar, o rascunho é ignorado', () => {
    expect(initialGameForm(game, { title: 'Outro' }).title).toBe('Futebolada');
  });
});
