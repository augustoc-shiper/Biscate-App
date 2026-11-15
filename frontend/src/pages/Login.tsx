import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import MotionPage from '../components/MotionPage';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apiMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { error?: { message?: string } } };
  };
  return (
    e?.response?.data?.error?.message ?? 'Algo correu mal. Tente novamente.'
  );
}

type Mode = 'login' | 'register';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'professional'>('client');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode): void {
    setMode(next);
    setFieldError(null);
    setApiError(null);
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setFieldError(null);
    setApiError(null);

    if (!EMAIL_RE.test(email)) {
      setFieldError('Email inválido');
      return;
    }
    if (!password) {
      setFieldError('Preencha a senha');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setFieldError('Preencha o nome');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name: name.trim(), email, password, role });
      }
      navigate('/app', { replace: true });
    } catch (err) {
      setApiError(apiMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <header className="login-hero">
        <div className="login-logo">
          bis<span>kato</span>
        </div>
        <p className="login-tagline">
          O seu kamba para qualquer biscate.
        </p>
      </header>

      <MotionPage>
        <section className="login-card">
          <div role="tablist" aria-label="Entrar ou criar conta">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'tab active' : 'tab'}
              onClick={() => switchMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'tab active' : 'tab'}
              onClick={() => switchMode('register')}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={onSubmit} noValidate>
            {mode === 'register' && (
              <label>
                Nome
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="O seu nome"
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
                autoComplete="email"
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
              />
            </label>

            {mode === 'register' && (
              <fieldset className="role-choice">
                <legend>Sou</legend>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    checked={role === 'client'}
                    onChange={() => setRole('client')}
                  />
                  Cliente
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="professional"
                    checked={role === 'professional'}
                    onChange={() => setRole('professional')}
                  />
                  Profissional
                </label>
              </fieldset>
            )}

            {fieldError && (
              <p className="form-error" role="alert">
                {fieldError}
              </p>
            )}
            {apiError && (
              <p className="form-error" role="alert">
                {apiError}
              </p>
            )}

            <button type="submit" className="submit" disabled={submitting}>
              {submitting
                ? 'A processar…'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Criar conta'}
            </button>
          </form>
        </section>
      </MotionPage>
    </div>
  );
}
