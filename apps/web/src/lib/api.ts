import { getToken } from '../auth/auth-store';
import type { WatchedSymbol, PortfolioDto, BotDto, TradeDto, PositionDto } from '@trading/shared';

interface LoginResponse {
  token: string;
  user: { id: string; email: string };
}

/** fetch authentifié : ajoute l'en-tête `Authorization: Bearer <token>` si on est connecté. */
async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
  });
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

/** Appelle le backend pour se connecter. Lève une erreur si les identifiants sont refusés. */
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Connexion échouée.');
  }

  return (await response.json()) as LoginResponse;
}

/** Liste les cryptos suivies par l'utilisateur connecté. */
export async function fetchWatchlist(): Promise<WatchedSymbol[]> {
  const response = await authFetch('/api/watchlist');
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Chargement de la watchlist échoué.'));
  }
  return (await response.json()) as WatchedSymbol[];
}

/** Ajoute une crypto ; renvoie la liste à jour. */
export async function addWatched(symbol: string): Promise<WatchedSymbol[]> {
  const response = await authFetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Ajout échoué.'));
  }
  return (await response.json()) as WatchedSymbol[];
}

/** Retire une crypto de la watchlist. */
export async function removeWatched(symbol: string): Promise<void> {
  const response = await authFetch(`/api/watchlist/${symbol}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Suppression échouée.'));
  }
}

/** Liste les portefeuilles de l'utilisateur connecté. */
export async function fetchPortfolios(): Promise<PortfolioDto[]> {
  const response = await authFetch('/api/portfolios');
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Chargement des portefeuilles échoué.'));
  }
  return (await response.json()) as PortfolioDto[];
}

/** Crée un portefeuille (nom + capital initial fictif). */
export async function createPortfolio(name: string, initialCash: string): Promise<PortfolioDto> {
  const response = await authFetch('/api/portfolios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, initialCash }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Création échouée.'));
  }
  return (await response.json()) as PortfolioDto;
}

/** Supprime un portefeuille. */
export async function removePortfolio(id: string): Promise<void> {
  const response = await authFetch(`/api/portfolios/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Suppression échouée.'));
  }
}

/** Trades d'un portefeuille (optionnellement filtrés par symbole). */
export async function fetchTrades(portfolioId: string, symbol?: string): Promise<TradeDto[]> {
  const query = symbol === undefined ? '' : `?symbol=${encodeURIComponent(symbol)}`;
  const response = await authFetch(`/api/portfolios/${portfolioId}/trades${query}`);
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Chargement des trades échoué.'));
  }
  return (await response.json()) as TradeDto[];
}

/** Positions d'un portefeuille. */
export async function fetchPositions(portfolioId: string): Promise<PositionDto[]> {
  const response = await authFetch(`/api/portfolios/${portfolioId}/positions`);
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Chargement des positions échoué.'));
  }
  return (await response.json()) as PositionDto[];
}

/** Liste des clés de stratégies disponibles. */
export async function fetchStrategies(): Promise<string[]> {
  const response = await authFetch('/api/strategies');
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Chargement des stratégies échoué.'));
  }
  return (await response.json()) as string[];
}

/** Bots en cours. */
export async function fetchBots(): Promise<BotDto[]> {
  const response = await authFetch('/api/bots');
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Chargement des bots échoué.'));
  }
  return (await response.json()) as BotDto[];
}

export interface CreateBotInput {
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: string;
}

/** Démarre un bot. */
export async function createBot(input: CreateBotInput): Promise<BotDto> {
  const response = await authFetch('/api/bots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Démarrage du bot échoué.'));
  }
  return (await response.json()) as BotDto;
}

/** Arrête un bot. */
export async function stopBot(id: string): Promise<void> {
  const response = await authFetch(`/api/bots/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Arrêt du bot échoué.'));
  }
}
