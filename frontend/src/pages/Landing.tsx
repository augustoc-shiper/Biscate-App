import { motion, type Variants } from 'motion/react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Logo Biscate"
    >
      <rect width="48" height="48" rx="12" fill="#C8102E" />
      <path
        d="M16 12v24M16 12h9a6 6 0 0 1 0 12h-9M16 24h10a6 6 0 0 1 0 12H16"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M37 6l4 4-4 4-4-4z" fill="#F7B500" />
    </svg>
  );
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const PROBLEMS = [
  {
    title: 'Difícil de encontrar',
    text: 'Hoje depende do “conhecido de um conhecido” ou de grupos de WhatsApp cheios de mensagens.',
  },
  {
    title: 'Difícil de confiar',
    text: 'Sem avaliações nem verificação, cada contratação é um risco para o cliente.',
  },
  {
    title: 'Difícil de crescer',
    text: 'O profissional só trabalha quando alguém passa por acaso e não tem montra para mostrar o que sabe fazer.',
  },
];

const STEPS = [
  {
    title: 'Procure',
    text: 'Escolha o serviço e o bairro. Veja perfis com nota, fotos de trabalhos e selo Verificado.',
  },
  {
    title: 'Converse',
    text: 'Fale pelo chat, ligue ou peça um orçamento. Sem compromisso.',
  },
  {
    title: 'Avalie',
    text: 'Depois do serviço, deixe a sua nota. Assim todos sabem em quem confiar.',
  },
];

const AUDIENCES = [
  {
    title: 'Sou cliente',
    lead: 'Sempre grátis.',
    items: [
      'Pesquisa por serviço, bairro e preço',
      'Chat e pedido de orçamento',
      'Avaliações reais e selo Verificado',
      'Publique um pedido e receba propostas',
    ],
  },
  {
    title: 'Sou profissional',
    lead: 'Pague um plano e apareça nas pesquisas.',
    items: [
      'Perfil com fotos dos seus trabalhos',
      'Clientes perto de si, sem intermediários',
      'Painel com visitas e contactos',
      'Pagamento por referência ou Multicaixa Express',
    ],
  },
];

const LANDING_PLANS = [
  { note: 'Para experimentar', name: '3 dias', price: '500 Kz' },
  { note: 'Uma semana de trabalho', name: '1 semana', price: '1.000 Kz' },
  {
    note: null,
    name: '1 mês',
    price: '3.000 Kz',
    highlight: true,
    extra: 'Perfil visível durante 30 dias',
  },
  { note: 'Poupa 6.000 Kz', name: '1 ano', price: '30.000 Kz' },
];

const FAQ = [
  {
    q: 'É grátis para clientes?',
    a: 'Sim. Só os profissionais pagam um plano para aparecer nas pesquisas.',
  },
  {
    q: 'O que significa o selo Verificado?',
    a: 'A nossa equipa confirma o BI e o telefone do profissional antes de dar o selo.',
  },
  {
    q: 'Como se paga ao profissional?',
    a: 'Combinam entre si, em dinheiro ou transferência. O pagamento protegido está previsto para uma fase futura.',
  },
  {
    q: 'Como paga o profissional o plano?',
    a: 'Por referência (ATM, internet banking ou Multicaixa Express). O plano activa quando o pagamento é confirmado.',
  },
  {
    q: 'Em que zonas funciona?',
    a: 'Começamos em Luanda (Maianga, Talatona, Viana, Cazenga, Kilamba e Rangel) e vamos crescer para outras províncias.',
  },
];

function Section({
  id,
  grey = false,
  children,
}: {
  id?: string;
  grey?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      className={grey ? 'g' : undefined}
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.section>
  );
}

function Cards({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="cards"
      variants={listVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <header>
        <div className="wrap">
          <a className="logo" href="#top">
            <Logo />
            biscate
          </a>
          <nav>
            <a href="#problema">O problema</a>
            <a href="#como">Como funciona</a>
            <a href="#profissionais">Profissionais</a>
            <a href="#planos">Planos</a>
            <a href="#faq">Perguntas</a>
          </nav>
          <Link className="btn" to="/login">
            Experimentar a app
          </Link>
        </div>
      </header>

      <main id="top">
        <div className="hero">
          <div className="wrap">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1>Encontre quem resolve. Ou seja quem resolve.</h1>
              <p>
                O Biscate junta quem precisa de um serviço com quem o faz, no
                seu bairro. Grátis para clientes. Simples para profissionais.
              </p>
              <div className="acts">
                <Link className="btn w" to="/login">
                  Experimentar a app
                </Link>
                <a className="btn o" href="#profissionais">
                  Sou profissional
                </a>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <img
                src="/biscate-hero.svg"
                alt="Profissionais angolanos a trabalhar"
              />
            </motion.div>
          </div>
        </div>
        <div className="band" />

        <Section id="problema">
          <div className="wrap">
            <h2>Quem precisa e quem faz não se encontram</h2>
            <p className="lead">
              Em Luanda há muito talento a trabalhar sem ser visto, e muita
              gente a procurar alguém de confiança sem saber a quem ligar.
            </p>
            <Cards>
              {PROBLEMS.map((card) => (
                <motion.div className="card" key={card.title} variants={itemVariants}>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </motion.div>
              ))}
            </Cards>
          </div>
        </Section>

        <Section id="como" grey>
          <div className="wrap">
            <h2>Como funciona</h2>
            <p className="lead">
              Três passos, no telemóvel e sem complicações.
            </p>
            <Cards>
              {STEPS.map((step, index) => (
                <motion.div className="card" key={step.title} variants={itemVariants}>
                  <span className="n">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </motion.div>
              ))}
            </Cards>
          </div>
        </Section>

        <Section id="profissionais">
          <div className="wrap">
            <h2>Para clientes e para profissionais</h2>
            <p className="lead">Cada lado tem o que precisa.</p>
            <div className="two">
              {AUDIENCES.map((audience) => (
                <motion.div className="card" key={audience.title} variants={itemVariants}>
                  <h3>{audience.title}</h3>
                  <p>{audience.lead}</p>
                  <ul>
                    {audience.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="planos" grey>
          <div className="wrap">
            <h2>Planos para profissionais</h2>
            <p className="lead">
              Escolha o período que lhe convém. Valores de exemplo, a definir
              antes do lançamento.
            </p>
            <Cards>
              {LANDING_PLANS.map((plan) => (
                <motion.div
                  className={plan.highlight ? 'card plan hl' : 'card plan'}
                  key={plan.name}
                  variants={itemVariants}
                >
                  {plan.highlight && <span className="tag">Mais escolhido</span>}
                  {plan.note && <p>{plan.note}</p>}
                  <h3>{plan.name}</h3>
                  <b>{plan.price}</b>
                  {plan.extra && <p>{plan.extra}</p>}
                </motion.div>
              ))}
            </Cards>
          </div>
        </Section>

        <Section id="faq">
          <div className="wrap">
            <h2>Perguntas frequentes</h2>
            <p className="lead">As dúvidas mais comuns.</p>
            <div className="faq">
              {FAQ.map((entry) => (
                <details key={entry.q}>
                  <summary>{entry.q}</summary>
                  <p>{entry.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        <section className="cta">
          <div className="wrap">
            <h2>Pronto para experimentar?</h2>
            <p>
              Abra a app de demonstração no seu telemóvel e veja como funciona.
            </p>
            <Link className="btn w" to="/login">
              Abrir a app
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span>© 2026 Biscate · Luanda, Angola</span>
          <span>
            Contacto: <a href="mailto:ola@biscate.example">ola@biscate.example</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
