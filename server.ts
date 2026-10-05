import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { MultiplayerRoom, MultiplayerPlayer, PlayerRoundRating, TournamentSession } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory rooms
const rooms = new Map<string, MultiplayerRoom>();
const clientSockets = new Map<WebSocket, { roomCode: string; playerId: string }>();

// Pre-defined fallback Spanish craft & supermarket beers for Xàbia / Costa Blanca
const SPANISH_BEER_DEFAULTS = [
  {
    name: "Alhambra Reserva 1925",
    brewery: "Cervezas Alhambra",
    origin: "Granada",
    style: "Helles Bock",
    abv: 6.4,
    description: "Kultige grüne Flasche ohne Papieretikett. Vollmundig, edel, malzig mit feiner Hopfenbittere.",
    flavorProfile: ["Malzig", "Karamell", "Hopfig-Herb", "Würzig"],
    trivia: "In ganz Spanien liebevoll 'La Verde' (die Grüne) genannt. Gefährlich süffig trotz 6,4%!",
    priceCategory: "premium_craft",
    priceEur: 1.85
  },
  {
    name: "Turia Märzen",
    brewery: "Damm",
    origin: "Valencia",
    style: "Märzen / Amber",
    abv: 5.4,
    description: "Das Aushängeschild der Region Valencia und Xàbia. Kräftig geröstetes Malz und feinherb.",
    flavorProfile: ["Röstig", "Malzig", "Karamell", "Süffig"],
    trivia: "Benannt nach dem Turia-Fluss in Valencia. Das Kultbier an der Costa Blanca zu Paella und Tapas!",
    priceCategory: "classic_bar",
    priceEur: 1.15
  },
  {
    name: "Steinburg Clásica (Mercadona)",
    brewery: "Font Salem / Mercadona",
    origin: "Valencia",
    style: "Lager",
    abv: 4.8,
    description: "Das ultimative spanische Supermarkt-Dosenbier für 38 Cent.",
    flavorProfile: ["Mild", "Spritzig", "Süffig"],
    trivia: "Kostet weniger als Mineralwasser und ist das Kult-Dosenbier in ganz Spanien!",
    priceCategory: "mercadona_budget",
    priceEur: 0.38
  },
  {
    name: "Estrella Galicia Especial",
    brewery: "Hijos de Rivera",
    origin: "Galicien",
    style: "Lager",
    abv: 5.5,
    description: "Klassisches spanisches Premium-Lager mit feiner Hopfenwürze und goldenem Glanz.",
    flavorProfile: ["Süffig", "Spritzig", "Hopfig-Herb", "Mild"],
    trivia: "Seit Generationen im Familienbesitz und das Lieblingsbier vieler Spanier in Strandbars.",
    priceCategory: "classic_bar",
    priceEur: 1.20
  },
  {
    name: "1906 Reserva Especial",
    brewery: "Hijos de Rivera",
    origin: "Galicien",
    style: "Helles Bock",
    abv: 6.5,
    description: "Dunkles Bernstein mit Röstnoten und wärmendem Körper.",
    flavorProfile: ["Röstig", "Malzig", "Würzig", "Karamell"],
    trivia: "Wird in Spanien 'Milnueve' genannt und räumt weltweit regelmäßig Goldmedaillen ab.",
    priceCategory: "premium_craft",
    priceEur: 1.75
  },
  {
    name: "Mahou 5 Estrellas",
    brewery: "Mahou",
    origin: "Madrid",
    style: "Pilsner",
    abv: 5.5,
    description: "Cremiger Schaum, moderate Bittere und frischer getreidiger Geschmack.",
    flavorProfile: ["Spritzig", "Hopfig-Herb", "Süffig"],
    trivia: "Das berühmteste Bier Madrids – in jeder Tapas-Bar Spaniens eiskalt vom Fass gezapft.",
    priceCategory: "classic_bar",
    priceEur: 1.10
  },
  {
    name: "Voll-Damm Doble Malta",
    brewery: "Damm",
    origin: "Barcelona",
    style: "Doble Malta",
    abv: 7.2,
    description: "Doppeltes Malz: Wuchtig, intensiv und süßlich-herb.",
    flavorProfile: ["Malzig", "Würzig", "Karamell", "Hopfig-Herb"],
    trivia: "Stolze 7,2% Alkohol! Bringt jede Verkostungsrunde sofort auf Betriebstemperatur.",
    priceCategory: "premium_craft",
    priceEur: 1.65
  },
  {
    name: "Inedit Damm",
    brewery: "Damm & Ferran Adrià",
    origin: "Barcelona",
    style: "Witbier / Weizen",
    abv: 4.8,
    description: "Kreiert von Starkoch Ferran Adrià mit Koriander, Orangenschalen und Süßholz.",
    flavorProfile: ["Fruchtig", "Zitrusfrisch", "Spritzig", "Würzig"],
    trivia: "Kreiert als Gourmetergänzung zu Spitzen-Tapas – unfiltriert und samtig im Mund.",
    priceCategory: "premium_craft",
    priceEur: 2.60
  },
  {
    name: "Cruzcampo Especial",
    brewery: "Heineken España",
    origin: "Sevilla",
    style: "Lager",
    abv: 5.6,
    description: "Extrem leicht, frisch und bitterarm mit dem markanten Gambrinus-Logo.",
    flavorProfile: ["Mild", "Spritzig", "Süffig"],
    trivia: "Das polarisierendste Bier Spaniens – in Andalusien vergöttert, im Tasting immer ein Streitfall.",
    priceCategory: "mercadona_budget",
    priceEur: 0.58
  },
  {
    name: "Rosa Blanca Hoppy Lager",
    brewery: "Damm",
    origin: "Mallorca",
    style: "Lager",
    abv: 3.4,
    description: "Kaltgehopftes balearisches Sommerbier mit frischer Zitrusnote.",
    flavorProfile: ["Zitrusfrisch", "Fruchtig", "Spritzig", "Mild"],
    trivia: "Kult-Klassiker von 1927 – der ideale leichte Starter für lange Sommerabende.",
    priceCategory: "premium_craft",
    priceEur: 1.55
  }
];

function broadcastToRoom(roomCode: string, payload: any) {
  const jsonStr = JSON.stringify(payload);
  clientSockets.forEach((meta, ws) => {
    if (meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(jsonStr);
    }
  });
}

// ---------------------------------------------------------------------------
// REST ENDPOINTS FOR MULTIPLAYER ROOMS
// ---------------------------------------------------------------------------

// Create Room
app.post('/api/room/create', (req, res) => {
  const { hostPlayer, session } = req.body;
  if (!hostPlayer || !session) {
    return res.status(400).json({ error: 'hostPlayer und session erforderlich.' });
  }

  // Generate 5-character readable room code, e.g. "XABIA" or "CERV2"
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const room: MultiplayerRoom = {
    code,
    hostId: hostPlayer.id,
    stage: 'LOBBY',
    currentBeerIndex: 0,
    players: [
      {
        id: hostPlayer.id,
        name: hostPlayer.name,
        nickname: hostPlayer.nickname || 'Host',
        avatarEmoji: hostPlayer.avatarEmoji || '👑',
        isHost: true,
        hasSubmitted: false
      }
    ],
    currentRoundRatings: {},
    session: {
      ...session,
      playMode: 'multiplayer',
      roomCode: code,
      players: [hostPlayer]
    }
  };

  rooms.set(code, room);
  res.json({ room });
});

// Join Room
app.post('/api/room/join', (req, res) => {
  const { roomCode, player } = req.body;
  if (!roomCode || !player) {
    return res.status(400).json({ error: 'roomCode und player erforderlich.' });
  }

  const normalizedCode = roomCode.trim().toUpperCase();
  const room = rooms.get(normalizedCode);
  if (!room) {
    return res.status(404).json({ error: `Raum "${normalizedCode}" wurde nicht gefunden.` });
  }

  // Check if player already in room
  const existingIdx = room.players.findIndex((p) => p.id === player.id || p.name.toLowerCase() === player.name.toLowerCase());
  if (existingIdx >= 0) {
    room.players[existingIdx] = {
      ...room.players[existingIdx],
      id: player.id,
      name: player.name,
      nickname: player.nickname || room.players[existingIdx].nickname,
      avatarEmoji: player.avatarEmoji || room.players[existingIdx].avatarEmoji
    };
  } else {
    room.players.push({
      id: player.id,
      name: player.name,
      nickname: player.nickname || 'Sommelier',
      avatarEmoji: player.avatarEmoji || '🍺',
      isHost: false,
      hasSubmitted: false
    });

    // Also add to session players if not present
    if (!room.session.players.some((p) => p.id === player.id)) {
      room.session.players.push(player);
    }
  }

  rooms.set(normalizedCode, room);
  broadcastToRoom(normalizedCode, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Get Room State
app.get('/api/room/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Raum nicht gefunden.' });
  }
  res.json({ room });
});

// Room Action (State mutation)
app.post('/api/room/action', (req, res) => {
  const { roomCode, action, payload } = req.body;
  if (!roomCode || !action) {
    return res.status(400).json({ error: 'roomCode und action erforderlich.' });
  }

  const normalizedCode = roomCode.trim().toUpperCase();
  const room = rooms.get(normalizedCode);
  if (!room) {
    return res.status(404).json({ error: 'Raum nicht gefunden.' });
  }

  switch (action) {
    case 'START_GAME':
      room.stage = 'TASTING';
      room.currentBeerIndex = 0;
      room.currentRoundRatings = {};
      room.players.forEach((p) => (p.hasSubmitted = false));
      break;

    case 'SUBMIT_RATING': {
      const { playerId, rating } = payload;
      room.currentRoundRatings[playerId] = rating;
      const p = room.players.find((pl) => pl.id === playerId);
      if (p) p.hasSubmitted = true;

      // If everyone has submitted, automatically transition to PRE_REVEAL
      const allSubmitted = room.players.every((pl) => pl.hasSubmitted);
      if (allSubmitted) {
        room.stage = 'PRE_REVEAL';
      }
      break;
    }

    case 'START_DRUMROLL':
      room.stage = 'DRUMROLL';
      break;

    case 'SHOW_REVEAL':
      room.stage = 'REVEAL';
      break;

    case 'TRIGGER_MINIGAME':
      room.stage = 'MINIGAME';
      room.currentMinigame = payload.minigame;
      break;

    case 'TRIGGER_HIDRATADOR':
      room.stage = 'HIDRATADOR';
      break;

    case 'NEXT_BEER':
      room.stage = 'TASTING';
      room.currentBeerIndex = payload.nextBeerIndex ?? room.currentBeerIndex + 1;
      room.currentRoundRatings = {};
      room.currentMinigame = undefined;
      room.players.forEach((pl) => (pl.hasSubmitted = false));
      break;

    case 'SHOW_FINAL':
      room.stage = 'FINAL';
      break;

    case 'SYNC_SESSION':
      room.session = payload.session;
      break;

    default:
      break;
  }

  rooms.set(normalizedCode, room);
  broadcastToRoom(normalizedCode, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// ---------------------------------------------------------------------------
// GEMINI BEER RECOGNITION
// ---------------------------------------------------------------------------
app.post('/api/recognize-beers', async (req, res) => {
  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Keine Bilder bereitgestellt.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 5;

    if (hasValidKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const imageParts: any[] = [];
        images.forEach((img: { data: string; mimeType?: string }) => {
          let base64 = img.data || '';
          let mimeType = img.mimeType || 'image/jpeg';
          if (base64.includes(';base64,')) {
            const split = base64.split(';base64,');
            mimeType = split[0].replace('data:', '') || mimeType;
            base64 = split[1];
          }
          imageParts.push({
            inlineData: {
              mimeType,
              data: base64
            }
          });
        });

        const promptText = `Du bist ein erfahrener spanischer Biersommelier an der Costa Blanca (Xàbia / Jávea).
Analysiere die Fotos von Bierflaschen oder Dosen.
Identifiziere alle sichtbaren Biere (z.B. Alhambra, Turia, Estrella Galicia, Mahou, Voll-Damm, Inedit, Cruzcampo, 1906, etc.).
Liefere ein valides JSON-Array zurück:
- name: Genauer Biername
- brewery: Brauerei / Marke
- origin: Spanische Region
- style: Einer von ["Lager", "Märzen / Amber", "Pilsner", "Helles Bock", "Doble Malta", "IPA", "Witbier / Weizen", "Anderer Stil"]
- abv: Zahl (z.B. 5.5)
- description: Knackige Geschmacksbeschreibung in 1 prägnanten Satz
- flavorProfile: Array aus 3 bis 4 Geschmacksnoten ausschließlich aus: ["Malzig", "Hopfig-Herb", "Fruchtig", "Karamell", "Süffig", "Spritzig", "Röstig", "Zitrusfrisch", "Mild", "Würzig"]
- trivia: Eine humorvolle Anekdote oder Fun-Fact zu diesem Bier für die Jungs am Tisch`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                ...imageParts,
                { text: promptText }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  brewery: { type: Type.STRING },
                  origin: { type: Type.STRING },
                  style: {
                    type: Type.STRING,
                    enum: [
                      "Lager",
                      "Märzen / Amber",
                      "Pilsner",
                      "Helles Bock",
                      "Doble Malta",
                      "IPA",
                      "Witbier / Weizen",
                      "Anderer Stil"
                    ]
                  },
                  abv: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  flavorProfile: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  trivia: { type: Type.STRING }
                },
                required: ["name", "brewery", "origin", "style", "abv", "description", "flavorProfile", "trivia"]
              }
            }
          }
        });

        let cleanText = (response.text || '').trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsedBeers = JSON.parse(cleanText);
        if (Array.isArray(parsedBeers) && parsedBeers.length > 0) {
          return res.json({ beers: parsedBeers, source: 'gemini_vision' });
        }
      } catch (geminiError: any) {
        console.warn('Gemini vision API call failed, falling back to smart defaults:', geminiError?.message || geminiError);
      }
    }

    const count = Math.min(Math.max(images.length * 2, 4), SPANISH_BEER_DEFAULTS.length);
    const selectedBeers = [...SPANISH_BEER_DEFAULTS]
      .sort(() => 0.5 - Math.random())
      .slice(0, count);

    return res.json({
      beers: selectedBeers,
      source: 'smart_fallback'
    });
  } catch (error: any) {
    console.error('Error in recognize-beers endpoint:', error);
    return res.json({
      beers: SPANISH_BEER_DEFAULTS.slice(0, 5),
      source: 'smart_fallback'
    });
  }
});

// ---------------------------------------------------------------------------
// WEBSOCKET SERVER ATTACHMENT
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
        return;
      }
      if (msg.type === 'SUBSCRIBE_ROOM' && msg.roomCode) {
        const code = msg.roomCode.trim().toUpperCase();
        clientSockets.set(ws, { roomCode: code, playerId: msg.playerId || '' });

        const room = rooms.get(code);
        if (room) {
          ws.send(JSON.stringify({ type: 'ROOM_UPDATE', room }));
        }
      }

      if (msg.type === 'EMOJI_BUZZER' && msg.roomCode) {
        const code = msg.roomCode.trim().toUpperCase();
        broadcastToRoom(code, {
          type: 'LIVE_REACTION',
          reactionType: 'emoji',
          emoji: msg.emoji,
          senderName: msg.senderName || 'Mitspieler',
          id: Date.now() + '-' + Math.random().toString(36).substring(2, 7)
        });
      }

      if (msg.type === 'SOUND_TRIGGER' && msg.roomCode) {
        const code = msg.roomCode.trim().toUpperCase();
        broadcastToRoom(code, {
          type: 'LIVE_REACTION',
          reactionType: 'sound',
          sound: msg.sound,
          senderName: msg.senderName || 'Mitspieler',
          id: Date.now() + '-' + Math.random().toString(36).substring(2, 7)
        });
      }
    } catch (e) {
      console.error('WebSocket message parsing error:', e);
    }
  });

  ws.on('close', () => {
    clientSockets.delete(ws);
  });
});

async function startServer() {
  const hasDist = fs.existsSync(path.join(__dirname, 'dist', 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🍻 Bier-Tasting Server läuft auf Port ${PORT}!`);
    console.log(`👉 Lokal: http://localhost:${PORT}`);
    
    // Find local network IP (e.g. 192.168.x.x) for phones on same Wi-Fi
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`📱 Handy im selben WLAN: http://${net.address}:${PORT}`);
        }
      }
    }
  });
}

startServer();
