import { MultiplayerRoom, Player, TournamentSession } from '../types';

type RoomListener = (room: MultiplayerRoom) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private currentRoomCode: string | null = null;
  private currentPlayerId: string | null = null;
  private listeners: Set<RoomListener> = new Set();
  private pollInterval: number | null = null;

  public subscribe(roomCode: string, playerId: string, callback: RoomListener): () => void {
    this.currentRoomCode = roomCode.toUpperCase();
    this.currentPlayerId = playerId;
    this.listeners.add(callback);

    this.connectWebSocket();
    this.startPollingFallback();

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.currentRoomCode && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'SUBSCRIBE_ROOM',
            roomCode: this.currentRoomCode,
            playerId: this.currentPlayerId
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ROOM_UPDATE' && msg.room) {
            this.notifyListeners(msg.room);
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('WebSocket connection error, fallback polling active.');
      };

      this.ws.onclose = () => {
        // Reconnect after 3 seconds if listeners still active
        if (this.listeners.size > 0) {
          setTimeout(() => this.connectWebSocket(), 3000);
        }
      };
    } catch (e) {
      console.warn('Failed to initialize WebSocket:', e);
    }
  }

  private startPollingFallback() {
    if (this.pollInterval !== null) return;
    this.pollInterval = window.setInterval(async () => {
      if (!this.currentRoomCode || this.listeners.size === 0) return;
      try {
        const res = await fetch(`/api/room/${this.currentRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.room) {
            this.notifyListeners(data.room);
          }
        }
      } catch (err) {
        // Ignore background polling glitches
      }
    }, 2000);
  }

  private notifyListeners(room: MultiplayerRoom) {
    this.listeners.forEach((listener) => listener(room));
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.currentRoomCode = null;
    this.currentPlayerId = null;
  }

  public async createRoom(hostPlayer: Player, session: TournamentSession): Promise<MultiplayerRoom> {
    const res = await fetch('/api/room/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPlayer, session })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fehler beim Erstellen des Raums');
    }
    const data = await res.json();
    return data.room;
  }

  public async joinRoom(roomCode: string, player: Player): Promise<MultiplayerRoom> {
    const res = await fetch('/api/room/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, player })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Raum nicht gefunden oder voll');
    }
    const data = await res.json();
    return data.room;
  }

  public async sendAction(roomCode: string, action: string, payload: any = {}): Promise<MultiplayerRoom> {
    const res = await fetch('/api/room/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, action, payload })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Aktion konnte nicht ausgeführt werden');
    }
    const data = await res.json();
    return data.room;
  }
}

export const multiplayerClient = new MultiplayerClient();
