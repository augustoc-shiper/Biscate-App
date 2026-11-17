import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { basename } from 'node:path';
import { db } from './client.js';
import {
  bairro,
  categories,
  conversations,
  favorites,
  messages,
  notifications,
  offers,
  payments,
  plans,
  professionalProfiles,
  requests,
  reviews,
  users,
} from './schema.js';

const CATS = [
  { id: 1, name: 'Pedreiro', icon: 'Hammer' },
  { id: 2, name: 'Electricista', icon: 'Zap' },
  { id: 3, name: 'Canalizador', icon: 'Droplet' },
  { id: 4, name: 'Costura', icon: 'Scissors' },
  { id: 5, name: 'Limpeza', icon: 'Sparkles' },
  { id: 6, name: 'Mudanças', icon: 'Truck' },
  { id: 7, name: 'Explicações', icon: 'BookOpen' },
  { id: 8, name: 'Pintura', icon: 'Paintbrush' },
];

const BAIRROS = [
  { id: 1, name: 'Maianga' },
  { id: 2, name: 'Talatona' },
  { id: 3, name: 'Viana' },
  { id: 4, name: 'Cazenga' },
  { id: 5, name: 'Kilamba' },
  { id: 6, name: 'Rangel' },
];

const PLANS = [
  { id: 1, days: 3, priceKz: 500, name: '3 dias', highlight: false },
  { id: 2, days: 7, priceKz: 1000, name: '1 semana', highlight: false },
  { id: 3, days: 30, priceKz: 3000, name: '1 mês', highlight: true },
  { id: 4, days: 365, priceKz: 30000, name: '1 ano', highlight: false },
];

type ProSeed = {
  id: string;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  categoryId: number;
  bairroId: number;
  priceText: string;
  priceMin: number;
  ratingAvg: number;
  ratingCount: number;
  distanceKm: number;
  availableToday: boolean;
  visitsCount: number;
  planDays: number;
  bio: string;
};

const PROS: ProSeed[] = [
  {
    id: 'seed-user-manuel',
    name: 'Manuel Kiala',
    email: 'manuel.kiala@biscate.ao',
    phone: '+244 923 111 111',
    verified: true,
    categoryId: 1,
    bairroId: 4,
    priceText: '8.000 Kz/dia',
    priceMin: 8000,
    ratingAvg: 4.8,
    ratingCount: 42,
    distanceKm: 6,
    availableToday: false,
    visitsCount: 96,
    planDays: 365,
    bio: 'Pedreiro há 15 anos. Rebocos, muros, pavimentos e pequenas obras.',
  },
  {
    id: 'seed-user-teresa',
    name: 'Teresa Domingos',
    email: 'teresa.domingos@biscate.ao',
    phone: '+244 923 222 222',
    verified: true,
    categoryId: 4,
    bairroId: 3,
    priceText: '2.500 Kz/peça',
    priceMin: 2500,
    ratingAvg: 4.9,
    ratingCount: 67,
    distanceKm: 12,
    availableToday: false,
    visitsCount: 74,
    planDays: 30,
    bio: 'Fatos, vestidos e arranjos. Entrega em 3 dias.',
  },
  {
    id: 'seed-user-joaquim',
    name: 'Joaquim Neto',
    email: 'profissional@biscate.ao',
    phone: '+244 923 333 333',
    verified: true,
    categoryId: 2,
    bairroId: 2,
    priceText: '5.000 Kz/visita',
    priceMin: 5000,
    ratingAvg: 4.7,
    ratingCount: 58,
    distanceKm: 3,
    availableToday: true,
    visitsCount: 128,
    planDays: 30,
    bio: 'Instalações, quadros eléctricos e avarias. Atendo no mesmo dia.',
  },
  {
    id: 'seed-user-paulo',
    name: 'Paulo Cassule',
    email: 'paulo.cassule@biscate.ao',
    phone: '+244 923 444 444',
    verified: false,
    categoryId: 3,
    bairroId: 5,
    priceText: '4.000 Kz/visita',
    priceMin: 4000,
    ratingAvg: 4.5,
    ratingCount: 23,
    distanceKm: 5,
    availableToday: false,
    visitsCount: 41,
    planDays: 7,
    bio: 'Fugas, torneiras, sanitas e esgotos.',
  },
  {
    id: 'seed-user-esperanca',
    name: 'Esperança Lopes',
    email: 'esperanca.lopes@biscate.ao',
    phone: '+244 923 555 555',
    verified: true,
    categoryId: 5,
    bairroId: 1,
    priceText: '6.000 Kz/dia',
    priceMin: 6000,
    ratingAvg: 4.6,
    ratingCount: 31,
    distanceKm: 2,
    availableToday: true,
    visitsCount: 68,
    planDays: 30,
    bio: 'Limpeza de casas, escritórios e pós-obra.',
  },
  {
    id: 'seed-user-domingos',
    name: 'Domingos Sebastião',
    email: 'domingos.sebastiao@biscate.ao',
    phone: '+244 923 666 666',
    verified: false,
    categoryId: 6,
    bairroId: 6,
    priceText: '15.000 Kz/viagem',
    priceMin: 15000,
    ratingAvg: 4.4,
    ratingCount: 19,
    distanceKm: 8,
    availableToday: true,
    visitsCount: 37,
    planDays: 3,
    bio: 'Carrinha e dois ajudantes para a sua mudança.',
  },
];

const CLIENTS = [
  { id: 'seed-user-ana', name: 'Ana Matos', email: 'cliente@biscate.ao' },
  { id: 'seed-user-carlos', name: 'Carlos Pinto', email: 'carlos.pinto@biscate.ao' },
  { id: 'seed-user-rosa', name: 'Rosa Fernandes', email: 'rosa.fernandes@biscate.ao' },
];

const day = 24 * 60 * 60 * 1000;
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Dados de demonstracao (password `biscate123`) apenas em dev/test.
 * Em producao nao sao inseridos; a conta admin vem de `seedAdmin()`.
 */
export async function seed(database = db): Promise<void> {
  if (isProduction()) {
    console.warn('[seed] Producao: dados de demonstracao nao inseridos.');
    return;
  }

  const passwordHash = bcrypt.hashSync('biscate123', 10);

  await database.insert(categories).values(CATS).onConflictDoNothing();
  await database.insert(bairro).values(BAIRROS).onConflictDoNothing();
  await database.insert(plans).values(PLANS).onConflictDoNothing();

  await database
    .insert(users)
    .values([
      ...PROS.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        passwordHash,
        role: 'professional' as const,
        phone: p.phone,
        bio: p.bio,
        verified: p.verified,
      })),
      ...CLIENTS.map((c, i) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        passwordHash,
        role: 'client' as const,
        phone: `+244 924 000 00${i + 1}`,
      })),
    ])
    .onConflictDoNothing({ target: users.email });

  for (const p of PROS) {
    const values = {
      userId: p.id,
      categoryId: p.categoryId,
      bairroId: p.bairroId,
      priceText: p.priceText,
      priceMin: p.priceMin,
      responseTime: '1 h',
      availableToday: p.availableToday,
      planExpiresAt: new Date(Date.now() + p.planDays * day),
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      visitsCount: p.visitsCount,
      distanceKm: p.distanceKm,
    };
    await database
      .insert(professionalProfiles)
      .values(values)
      .onConflictDoUpdate({
        target: professionalProfiles.userId,
        set: {
          availableToday: values.availableToday,
          planExpiresAt: values.planExpiresAt,
          ratingAvg: values.ratingAvg,
          ratingCount: values.ratingCount,
          visitsCount: values.visitsCount,
          distanceKm: values.distanceKm,
        },
      });
  }

  await database
    .insert(favorites)
    .values([
      { userId: 'seed-user-ana', professionalId: 'seed-user-manuel' },
      { userId: 'seed-user-carlos', professionalId: 'seed-user-teresa' },
    ])
    .onConflictDoNothing();

  await database
    .insert(requests)
    .values([
      {
        id: 'seed-req-muro',
        clientId: 'seed-user-ana',
        categoryId: 1,
        description:
          'Preciso de rebocar um muro do quintal, cerca de 10 metros. Incluir acabamento.',
        bairroId: 4,
        when: 'week',
        status: 'open',
      },
    ])
    .onConflictDoNothing();

  await database
    .insert(offers)
    .values([
      {
        id: 'seed-offer-1',
        requestId: 'seed-req-muro',
        professionalId: 'seed-user-manuel',
        price: 15000,
        message: '1 dia de trabalho, materiais pequenos incluídos.',
        status: 'sent',
      },
      {
        id: 'seed-offer-2',
        requestId: 'seed-req-muro',
        professionalId: 'seed-user-domingos',
        price: 18000,
        message: 'Levamos dois ajudantes e fazemos em dois dias.',
        status: 'sent',
      },
    ])
    .onConflictDoNothing();

  const convs = [
    { id: 'seed-conv-ana-joaquim', clientId: 'seed-user-ana', professionalId: 'seed-user-joaquim' },
    { id: 'seed-conv-ana-manuel', clientId: 'seed-user-ana', professionalId: 'seed-user-manuel' },
    { id: 'seed-conv-rosa-manuel', clientId: 'seed-user-rosa', professionalId: 'seed-user-manuel' },
    { id: 'seed-conv-bento-manuel', clientId: 'seed-user-carlos', professionalId: 'seed-user-manuel' },
  ];
  await database
    .insert(conversations)
    .values(convs.map((c) => ({ ...c, lastMessageAt: hoursAgo(1) })))
    .onConflictDoNothing({ target: [conversations.clientId, conversations.professionalId] });

  await database
    .insert(messages)
    .values([
      {
        id: 'seed-msg-1',
        conversationId: 'seed-conv-ana-joaquim',
        senderId: 'seed-user-joaquim',
        body: 'Bom dia! Em que posso ajudar?',
        kind: 'text',
        readAt: hoursAgo(5),
        createdAt: hoursAgo(5),
      },
      {
        id: 'seed-msg-2',
        conversationId: 'seed-conv-ana-joaquim',
        senderId: 'seed-user-ana',
        body: 'Preciso de trocar o quadro eléctrico da minha casa.',
        kind: 'text',
        readAt: hoursAgo(4),
        createdAt: hoursAgo(4),
      },
      {
        id: 'seed-msg-3',
        conversationId: 'seed-conv-ana-joaquim',
        senderId: 'seed-user-joaquim',
        body: 'Consigo passar amanhã de manhã. Envie uma foto, por favor.',
        kind: 'text',
        readAt: hoursAgo(3),
        createdAt: hoursAgo(3),
      },
      {
        id: 'seed-msg-4',
        conversationId: 'seed-conv-ana-manuel',
        senderId: 'seed-user-manuel',
        body: 'O muro ficou pronto. Obrigado pela confiança!',
        kind: 'text',
        readAt: hoursAgo(26),
        createdAt: hoursAgo(26),
      },
      {
        id: 'seed-msg-5',
        conversationId: 'seed-conv-rosa-manuel',
        senderId: 'seed-user-manuel',
        body: 'Deixei tudo limpo no fim do serviço.',
        kind: 'text',
        readAt: hoursAgo(48),
        createdAt: hoursAgo(48),
      },
      {
        id: 'seed-msg-6',
        conversationId: 'seed-conv-bento-manuel',
        senderId: 'seed-user-manuel',
        body: 'Bom trabalho combinado, até sexta!',
        kind: 'text',
        readAt: hoursAgo(72),
        createdAt: hoursAgo(72),
      },
    ])
    .onConflictDoNothing();

  await database
    .insert(reviews)
    .values([
      {
        id: 'seed-review-1',
        conversationId: 'seed-conv-rosa-manuel',
        reviewerId: 'seed-user-rosa',
        reviewedId: 'seed-user-manuel',
        stars: 5,
        comment: 'Pontual e cuidadoso. Fez o trabalho em dois dias e deixou tudo limpo.',
        createdAt: hoursAgo(47),
      },
      {
        id: 'seed-review-2',
        conversationId: 'seed-conv-bento-manuel',
        reviewerId: 'seed-user-carlos',
        reviewedId: 'seed-user-manuel',
        stars: 4,
        comment: 'Bom trabalho. Chegou um pouco atrasado, mas avisou.',
        createdAt: hoursAgo(70),
      },
    ])
    .onConflictDoNothing();

  await database
    .insert(payments)
    .values(
      PROS.map((p, i) => ({
        id: `seed-pay-${i + 1}`,
        professionalId: p.id,
        planId: PLANS.find((pl) => pl.days === p.planDays)!.id,
        entity: '90210',
        reference: `482 917 3${String(10 + i)}`,
        amountKz: PLANS.find((pl) => pl.days === p.planDays)!.priceKz,
        status: 'confirmed' as const,
        confirmedAt: hoursAgo(24 * (i + 1)),
      })),
    )
    .onConflictDoNothing();

  await database
    .insert(notifications)
    .values([
      {
        id: 'seed-notif-1',
        userId: 'seed-user-ana',
        kind: 'chat',
        body: 'Joaquim Neto respondeu à sua mensagem',
        createdAt: hoursAgo(2),
      },
      {
        id: 'seed-notif-2',
        userId: 'seed-user-joaquim',
        kind: 'offer',
        body: 'Ana Matos publicou um pedido perto de si',
        createdAt: hoursAgo(6),
      },
    ])
    .onConflictDoNothing();
}

/**
 * Primeira conta admin, criada apenas a partir de variaveis de ambiente.
 * - sem defaults;
 * - idempotente (email ja admin => no-op);
 * - email existente como client/professional => erro, sem promocao;
 * - producao sem env => falha; dev/test sem env => aviso.
 */
export async function seedAdmin(
  database = db,
): Promise<{ created: boolean }> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!email || !password || !name) {
    if (isProduction()) {
      throw new Error(
        'ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_NAME sao obrigatorios em producao',
      );
    }
    console.warn(
      '[seedAdmin] ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME nao definidos: admin nao criado.',
    );
    return { created: false };
  }

  const existing = await database.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    if (existing.role === 'admin') return { created: false };
    throw new Error(
      `Email ${email} ja existe como ${existing.role}; nao promover automaticamente.`,
    );
  }

  await database.insert(users).values({
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'admin',
    verified: true,
  });
  return { created: true };
}

// `split('/')` falhava no Windows; basename() e portatil.
const scriptName = basename(process.argv[1] ?? '');
const isCli = scriptName === 'seed.ts' || scriptName === 'seed.js';
if (isCli) {
  (async () => {
    await seed();
    const admin = await seedAdmin();
    console.log(
      `Seed concluído.${admin.created ? ' Admin criado.' : ' Admin nao criado (ver avisos acima).'}`,
    );
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
