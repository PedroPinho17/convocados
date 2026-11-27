import { describe, expect, it } from 'vitest';
import {
  createGameSchema,
  foldText,
  initialGameForm,
  sportLabel,
  updateGameSchema,
  venueLabel,
  type GameDto,
} from '../index';

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
  sport: 'futsal',
  venueId: null,
  groupId: null,
  groupName: null,
  scoreA: null,
  scoreB: null,
  summary: null,
};

describe('initialGameForm', () => {
  it('jogo novo: valores por defeito do futebol (10 vagas, 2 suplentes, 30 €)', () => {
    expect(initialGameForm()).toEqual({
      title: '',
      location: '',
      startsAt: '',
      slots: 10,
      subs: 2,
      totalEuros: 30,
      sport: 'football',
      venueId: null,
    });
  });

  it('jogo novo num grupo de padel: 4 vagas e 1 suplente', () => {
    expect(initialGameForm(null, null, { sport: 'padel' })).toMatchObject({
      sport: 'padel',
      slots: 4,
      subs: 1,
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
      sport: 'futsal',
      venueId: null,
    });
  });

  it('rascunho da IA: o que veio, e o resto por defeito', () => {
    expect(
      initialGameForm(null, { location: 'Romaniz', startsAt: '2030-07-10T20:00:00.000Z' }),
    ).toMatchObject({
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

describe('schemas do jogo', () => {
  const base = {
    title: 'Jogo',
    location: 'Pavilhão',
    startsAt: '2030-01-10T21:00:00.000Z',
    slots: 4,
    subs: 0,
    totalPriceCents: 2000,
  };

  it('criar: sem desporto fica futebol; desportos desconhecidos são recusados', () => {
    expect(createGameSchema.parse(base).sport).toBe('football');
    expect(createGameSchema.parse({ ...base, sport: 'padel' }).sport).toBe('padel');
    expect(createGameSchema.safeParse({ ...base, sport: 'xadrez' }).success).toBe(false);
  });

  it('editar: o desporto não volta a futebol sem querer, e o grupo não muda', () => {
    const parsed = updateGameSchema.parse({ title: 'Novo título', groupId: 'x' });
    expect(parsed).toEqual({ title: 'Novo título' });
  });
});

describe('textos', () => {
  it('sportLabel junta o emoji', () => {
    expect(sportLabel('padel')).toBe('🎾 Padel');
    expect(sportLabel('desconhecido')).toBe('desconhecido');
  });

  it('venueLabel junta a localidade quando não está no nome', () => {
    expect(venueLabel({ name: 'Pavilhão Municipal', city: 'Fiães' })).toBe('Pavilhão Municipal · Fiães');
    expect(venueLabel({ name: 'Piscinas de Lourosa', city: 'Lourosa' })).toBe('Piscinas de Lourosa');
    expect(venueLabel({ name: 'Romariz FC', city: null })).toBe('Romariz FC');
  });

  it('foldText tira acentos e maiúsculas', () => {
    expect(foldText('Fiães SÃO João')).toBe('fiaes sao joao');
  });
});
