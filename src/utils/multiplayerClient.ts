import { MultiplayerRoom, Player, TournamentSession } from '../types';

type RoomListener = (room: MultiplayerRoom) => void;
export type LiveReaction = {
  type: string;
  reactionType: 'emoji' | 'sound';
  emoji?: string;
  sound?: string;
  senderName: string;
  id: string;
};
type ReactionListener = (reaction: LiveReaction) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private currentRoomCode: string | null = null;
  private currentPlayerId: string | null = null;
  private listeners: Set<RoomListener> = new Set();
  private reactionListeners: Set<ReactionListener> = new Set();
  private pollInterval: number | null = null;
  private isWakeHandlerSetup = false;

  private heartbeatInterval: number | null = null;

  public subscribe(roomCode: string, playerId: string, callback: RoomListener): () => void {
    this.currentRoomCode = roomCode.toUpperCase();
    this.currentPlayerId = playerId;
    this.listeners.add(callback);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cerveza_active_room', this.currentRoomCode);
        sessionStorage.setItem('cerveza_active_player_id', this.currentPlayerId);
      } catch (e) {}
    }

    this.connectWebSocket();
    this.startPollingFallback();
    this.setupWakeReconnection();
    this.startHeartbeat();

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  private startHeartbeat() {
    if (this.heartbeatInterval !== null) return;
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentRoomCode) {
        this.ws.send(JSON.stringify({
          type: 'PING',
          roomCode: this.currentRoomCode
        }));
      }
    }, 12000);
  }

  private setupWakeReconnection() {
    if (this.isWakeHandlerSetup || typeof window === 'undefined') return;
    this.isWakeHandlerSetup = true;

    const handleWake = () => {
      if (!this.currentRoomCode || this.listeners.size === 0) return;

      // 1. Immediately fetch latest state so screen has zero lag after unlock
      this.fetchCurrentRoom();

      // 2. Re-establish WebSocket connection immediately if closed or connecting
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
        this.connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleWake();
      }
    });

    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    window.addEventListener('online', handleWake);
  }

  public async fetchCurrentRoom() {
    if (!this.currentRoomCode || this.listeners.size === 0) return;
    try {
      const res = await fetch(`/api/room/${this.currentRoomCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          this.notifyListeners(data.room);
        }
      }
    } catch (e) {
      // Ignore background network hiccups
    }
  }

  public subscribeReactions(callback: ReactionListener): () => void {
    this.reactionListeners.add(callback);
    return () => {
      this.reactionListeners.delete(callback);
    };
  }

  public sendEmojiBuzzer(emoji: string, senderName: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentRoomCode) {
      this.ws.send(JSON.stringify({
        type: 'EMOJI_BUZZER',
        roomCode: this.currentRoomCode,
        emoji,
        senderName
      }));
    }
  }

  public sendSoundTrigger(sound: string, senderName: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentRoomCode) {
      this.ws.send(JSON.stringify({
        type: 'SOUND_TRIGGER',
        roomCode: this.currentRoomCode,
        sound,
        senderName
      }));
    }
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
          } else if (msg.type === 'LIVE_REACTION') {
            this.reactionListeners.forEach((listener) => listener(msg));
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
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
