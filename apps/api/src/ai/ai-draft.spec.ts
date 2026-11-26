import {
  buildSystemPrompt,
  isUsable,
  lisbonToUtcIso,
  toDraft,
} from './ai-draft.js';

// Quinta-feira, 26 de novembro de 2026, 10:00 em Portugal (inverno, UTC+0).
const NOW = new Date('2026-11-26T10:00:00.000Z');

describe('lisbonToUtcIso', () => {
  it('no inverno, Portugal está em UTC', () => {
    expect(lisbonToUtcIso('2026-11-27', '21:00')).toBe(
      '2026-11-27T21:00:00.000Z',
    );
  });

  it('no verão, Portugal está em UTC+1', () => {
    expect(lisbonToUtcIso('2027-07-10', '21:00')).toBe(
      '2027-07-10T20:00:00.000Z',
    );
  });

  it('nos dias de mudança de hora', () => {
    // 28 mar 2027: às 01:00 UTC passa para UTC+1. 21:00 já é hora de verão.
    expect(lisbonToUtcIso('2027-03-28', '21:00')).toBe(
      '2027-03-28T20:00:00.000Z',
    );
    // 31 out 2027: volta a UTC.
    expect(lisbonToUtcIso('2027-10-31', '21:00')).toBe(
      '2027-10-31T21:00:00.000Z',
    );
  });

  it('recusa datas e horas que não existem', () => {
    expect(lisbonToUtcIso('2027-02-31', '21:00')).toBeNull();
    expect(lisbonToUtcIso('2027-11-27', '25:00')).toBeNull();
    expect(lisbonToUtcIso('27/11/2027', '21:00')).toBeNull();
    expect(lisbonToUtcIso('2027-11-27', '21h')).toBeNull();
    // Às 01:00 de 28 mar 2027 o relógio salta para as 02:00: 01:30 não existe.
    expect(lisbonToUtcIso('2027-03-28', '01:30')).toBeNull();
  });
});

describe('buildSystemPrompt', () => {
  it('diz ao modelo que dia é hoje, em Portugal', () => {
    const prompt = buildSystemPrompt(NOW);
    expect(prompt).toContain('Hoje é quinta-feira, 2026-11-26');
    expect(prompt).toContain('10:00');
  });

  it('perto da meia-noite usa a data de Portugal, não a UTC', () => {
    // 23:30 UTC de 30 jun = 00:30 de 1 jul em Portugal (verão).
    expect(buildSystemPrompt(new Date('2027-06-30T23:30:00.000Z'))).toContain(
      'Hoje é quinta-feira, 2027-07-01',
    );
  });
});

describe('toDraft', () => {
  it('converte a resposta do modelo no rascunho do formulário', () => {
    const draft = toDraft(
      {
        title: 'Futebolada de quinta',
        location: 'Pavilhão de Arrifana',
        date: '2026-11-26',
        time: '21:00',
        slots: 10,
        totalEuros: 30,
      },
      NOW,
    );
    expect(draft).toEqual({
      title: 'Futebolada de quinta',
      location: 'Pavilhão de Arrifana',
      startsAt: '2026-11-26T21:00:00.000Z',
      slots: 10,
      totalPriceCents: 3000,
    });
    expect(isUsable(draft)).toBe(true);
  });

  it('aceita números enviados como texto e preços com cêntimos', () => {
    expect(
      toDraft({ slots: '12', subs: '2', totalEuros: '42.5' }, NOW),
    ).toEqual({
      slots: 12,
      subs: 2,
      totalPriceCents: 4250,
    });
  });

  it('um campo inválido é descartado; os outros ficam, com uma nota', () => {
    const draft = toDraft(
      {
        location: 'Pavilhão',
        slots: 50,
        totalEuros: 'trinta',
        date: '2026-11-31',
        time: '21:00',
      },
      NOW,
    );
    expect(draft.location).toBe('Pavilhão');
    expect(draft.slots).toBeUndefined();
    expect(draft.totalPriceCents).toBeUndefined();
    expect(draft.startsAt).toBeUndefined();
    expect(draft.notes).toBe(
      'Confirma o número de vagas, o preço, a data: não consegui ler bem.',
    );
  });

  it('descarta datas no passado', () => {
    const draft = toDraft(
      { location: 'Pavilhão', date: '2026-11-26', time: '09:00' },
      NOW,
    );
    expect(draft.startsAt).toBeUndefined();
    expect(draft.notes).toContain('a data (já passou)');
  });

  it('só o dia ou só a hora não chega para a data', () => {
    expect(toDraft({ date: '2026-11-27' }, NOW).notes).toContain('a hora');
    expect(toDraft({ time: '21:00' }, NOW).notes).toContain('o dia');
  });

  it('mantém as notas do modelo e ignora lixo', () => {
    expect(toDraft({ notes: 'Não diz o preço.' }, NOW)).toEqual({
      notes: 'Não diz o preço.',
    });
    expect(toDraft('isto não é um objeto', NOW)).toEqual({});
    expect(toDraft({ title: { a: 1 }, location: '' }, NOW)).toEqual({
      notes: 'Confirma o título: não consegui ler bem.',
    });
  });

  it('sem local nem data não vale a pena (fica o formulário manual)', () => {
    expect(isUsable(toDraft({ title: 'Jogo', slots: 10 }, NOW))).toBe(false);
  });
});
