import { describe, it, expect } from 'vitest';
import { WebSocket } from 'ws';
import { MarketHub } from './market.gateway';

/**
 * Tests UNITAIRES de MarketHub SANS réseau : on ne lance jamais `start()` (qui ouvrirait
 * une connexion Binance). On couvre la gestion des consommateurs (clients dashboard +
 * workers), le snapshot initial, l'état « idle » et le désabonnement.
 * Le flux réel Binance est testé par binance.test.ts (opt-in réseau).
 */

/** Faux WebSocket : capture les messages envoyés et permet de déclencher 'close'. */
function fakeSocket(readyState: number = WebSocket.OPEN) {
  const handlers: Record<string, () => void> = {};
  return {
    readyState,
    sent: [] as string[],
    send(message: string) {
      this.sent.push(message);
    },
    on(event: string, cb: () => void) {
      handlers[event] = cb;
    },
    fireClose() {
      handlers.close?.();
    },
  };
}

type FakeSocket = ReturnType<typeof fakeSocket>;
const asWs = (s: FakeSocket) => s as unknown as WebSocket;

const newHub = () => new MarketHub({ symbol: 'BTCUSDT', interval: '1m' });

describe('MarketHub (sans réseau)', () => {
  describe('état initial', () => {
    it('démarre sans client et est inactif (idle)', () => {
      const hub = newHub();
      expect(hub.clientCount).toBe(0);
      expect(hub.isIdle()).toBe(true);
    });
  });

  describe('addClient', () => {
    it('envoie immédiatement un snapshot au client connecté', () => {
      const hub = newHub();
      const socket = fakeSocket();

      hub.addClient(asWs(socket));

      expect(socket.sent).toHaveLength(1);
      const message = JSON.parse(socket.sent[0]);
      expect(message).toMatchObject({
        type: 'snapshot',
        symbol: 'BTCUSDT',
        interval: '1m',
        price: null, // aucun prix connu tant que start() n'a pas tourné
        candles: [],
      });
    });

    it('compte le client et n’est plus idle', () => {
      const hub = newHub();
      hub.addClient(asWs(fakeSocket()));
      expect(hub.clientCount).toBe(1);
      expect(hub.isIdle()).toBe(false);
    });

    it('retire le client quand sa socket se ferme → redevient idle', () => {
      const hub = newHub();
      const socket = fakeSocket();
      hub.addClient(asWs(socket));

      socket.fireClose();

      expect(hub.clientCount).toBe(0);
      expect(hub.isIdle()).toBe(true);
    });

    it('n’envoie rien si la socket n’est pas OUVERTE', () => {
      const hub = newHub();
      const socket = fakeSocket(WebSocket.CLOSED);

      hub.addClient(asWs(socket));

      expect(socket.sent).toHaveLength(0);
    });
  });

  describe('onClosedCandle (consommateur worker in-process)', () => {
    it('rend le hub actif tant qu’un listener est abonné', () => {
      const hub = newHub();
      const unsubscribe = hub.onClosedCandle(() => {});
      expect(hub.isIdle()).toBe(false);

      unsubscribe();
      expect(hub.isIdle()).toBe(true);
    });

    it('reste actif s’il a un client OU un listener', () => {
      const hub = newHub();
      hub.addClient(asWs(fakeSocket()));
      const unsubscribe = hub.onClosedCandle(() => {});

      unsubscribe(); // il reste un client
      expect(hub.isIdle()).toBe(false);
    });
  });

  describe('stop', () => {
    it('ne lève pas même si le hub n’a jamais été démarré', () => {
      const hub = newHub();
      expect(() => hub.stop()).not.toThrow();
    });
  });
});
