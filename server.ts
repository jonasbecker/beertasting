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

// Pre-defined fallback beers matching the exact 18 kitchen counter beers from Xàbia
const SPANISH_BEER_DEFAULTS = [
  {
    name: "Stella Artois",
    brewery: "Stella Artois (AB InBev)",
    origin: "Belgien",
    style: "Lager",
    abv: 5.0,
    description: "Klassisches europäisches Premium-Lager. Goldgelb, feiner floraler Hopfen und knackig-erfrischender Abgang.",
    flavorProfile: ["Spritzig", "Hopfig-Herb", "Mild", "Süffig"],
    trivia: "Tradition seit 1366 aus Leuven in Belgien. Auf der Küchenzeile ganz links in der edlen grünen Flasche mit Goldfolie!",
    priceCategory: "classic_bar",
    priceEur: 1.30
  },
  {
    name: "Corona Cerveza",
    brewery: "Grupo Modelo",
    origin: "Mexiko",
    style: "Lager",
    abv: 4.5,
    description: "Kultige durchsichtige Flasche. Extrem leicht, strohgelb, erfrischend süffig und sommerlich mild.",
    flavorProfile: ["Mild", "Spritzig", "Süffig", "Zitrusfrisch"],
    trivia: "Das weltberühmte mexikanische Strandbier – gehört zu jedem Urlaub an der spanischen Küste!",
    priceCategory: "classic_bar",
    priceEur: 1.45
  },
  {
    name: "Leffe Blonde",
    brewery: "Abbaye de Leffe",
    origin: "Belgien",
    style: "Anderer Stil",
    abv: 6.6,
    description: "Belgisches Kloster-Blondbier mit gelbem Etikett. Noten von Nelke, süßem Malz, Vanille und reifem Apfel.",
    flavorProfile: ["Fruchtig", "Würzig", "Malzig", "Süffig"],
    trivia: "Bereits 1240 von den Mönchen in Dinant gebraut. Kräftige 6,6% vol mit eleganter Süße.",
    priceCategory: "premium_craft",
    priceEur: 1.95
  },
  {
    name: "Erdinger Weißbier",
    brewery: "Erdinger Weißbräu",
    origin: "Deutschland (Bayern)",
    style: "Witbier / Weizen",
    abv: 5.3,
    description: "Klassisches bayerisches Hefeweizen. Feine Hefe-Trübung, Bananen- und Nelkenaromen mit stabiler Krone.",
    flavorProfile: ["Fruchtig", "Spritzig", "Würzig", "Mild"],
    trivia: "Der bayerische Weißbier-Klassiker auf der spanischen Finca – ein Genuss zur Siesta!",
    priceCategory: "premium_craft",
    priceEur: 1.80
  },
  {
    name: "Heineken Original",
    brewery: "Heineken",
    origin: "Niederlande",
    style: "Lager",
    abv: 5.0,
    description: "Grüne Dose mit rotem Stern. Charakteristische fruchtige Noten durch Heineken A-Hefe, feine Bittere.",
    flavorProfile: ["Spritzig", "Hopfig-Herb", "Mild"],
    trivia: "In Amsterdam 1873 gegründet. Stand im Bild oben auf der Dose Karlsquell.",
    priceCategory: "classic_bar",
    priceEur: 1.15
  },
  {
    name: "Karlsquell Suave (Aldi)",
    brewery: "Font Salem / Aldi España",
    origin: "Spanien",
    style: "Lager",
    abv: 4.8,
    description: "Weiß-grüne Dose von Aldi Spanien. Extrem schlanker Körper, minimale Bittere, maximaler Durstlöscher.",
    flavorProfile: ["Mild", "Spritzig", "Süffig"],
    trivia: "Der 35-Cent-Preishit von Aldi Spanien – stand direkt unter der Heineken-Dose!",
    priceCategory: "mercadona_budget",
    priceEur: 0.35
  },
  {
    name: "Steinburg Especial (Mercadona)",
    brewery: "Font Salem / Mercadona",
    origin: "Valencia (Spanien)",
    style: "Lager",
    abv: 5.6,
    description: "Rote Dose mit goldenem Stern aus dem Mercadona. Kräftiger und malziger als die grüne Clásica.",
    flavorProfile: ["Malzig", "Süffig", "Spritzig"],
    trivia: "Die rote 'Especial'-Variante von Mercadona für nur 42 Cent – gefährlich süffig mit 5,6%!",
    priceCategory: "mercadona_budget",
    priceEur: 0.42
  },
  {
    name: "Steinburg Clásica (Mercadona)",
    brewery: "Font Salem / Mercadona",
    origin: "Valencia (Spanien)",
    style: "Lager",
    abv: 4.8,
    description: "Die dunkelgrüne Kult-Dose von Mercadona für 38 Cent. Leicht, erfrischend und treuer Begleiter jeder Finca.",
    flavorProfile: ["Mild", "Spritzig", "Süffig"],
    trivia: "Das beliebteste Billigbier Spaniens – stand unter der roten Steinburg Especial!",
    priceCategory: "mercadona_budget",
    priceEur: 0.38
  },
  {
    name: "Charles Quint St-Michel",
    brewery: "Brouwerij Haacht",
    origin: "Belgien",
    style: "Anderer Stil",
    abv: 6.1,
    description: "Braune Flasche mit dem Porträt von Kaiser Karl V. Aromatisch, hefebetont mit Zitrus- und Gewürznoten.",
    flavorProfile: ["Fruchtig", "Würzig", "Hopfig-Herb", "Malzig"],
    trivia: "Kaiser Karl V. wuchs in Flandern auf und liebte belgisches Bier so sehr, dass er es nach Spanien importieren ließ.",
    priceCategory: "premium_craft",
    priceEur: 2.10
  },
  {
    name: "Mescalina México (Cerveza + Mezcal)",
    brewery: "Cervezas Especiales",
    origin: "Spanien / Mexiko-Style",
    style: "Anderer Stil",
    abv: 4.5,
    description: "Dunkle Flasche mit türkis-gelbem Etikett. Verfeinert mit mexikanischem Mezcal und Agavengeschmack.",
    flavorProfile: ["Würzig", "Süffig", "Röstig", "Spritzig"],
    trivia: "Der verrückteste Exot auf eurer Küchenzeile! Bringt eine feine rauchige Mezcal-Note ins Bier.",
    priceCategory: "classic_bar",
    priceEur: 1.70
  },
  {
    name: "Birra Moretti L'Autentica",
    brewery: "Birra Moretti (Heineken Italia)",
    origin: "Italien",
    style: "Lager",
    abv: 4.6,
    description: "Italienisches Traditionslager mit dem trinkenden Mann mit grünem Hut auf dem Etikett. Mild, leicht malzig.",
    flavorProfile: ["Mild", "Malzig", "Spritzig", "Süffig"],
    trivia: "Das Etikett zeigt einen Herrn, den der Brauereichef 1942 in Udine fotografierte – sein Lohn war ein Bier!",
    priceCategory: "classic_bar",
    priceEur: 1.35
  },
  {
    name: "18/70 La Rubia",
    brewery: "18/70 (Heineken España)",
    origin: "Baskenland (Spanien)",
    style: "Helles Bock",
    abv: 6.2,
    description: "Dunkle Flasche mit markanter weißer '18/70'-Aufschrift. Kräftiges blondes Lager mit 6,2% und vollem Malzkörper.",
    flavorProfile: ["Malzig", "Hopfig-Herb", "Würzig", "Süffig"],
    trivia: "Startete als Geheimtipp in baskischen Kneipen in Donostia / San Sebastián und wurde zum spanischen Kultbier.",
    priceCategory: "premium_craft",
    priceEur: 1.65
  },
  {
    name: "Maternus Turbia (Aldi)",
    brewery: "Maternus (Aldi España)",
    origin: "Spanien / Deutschland",
    style: "Witbier / Weizen",
    abv: 5.0,
    description: "Braune Flasche mit weißem Längsetikett. Unfiltriertes, naturtrübes Zwickel-Bier mit vollmundiger Hefe.",
    flavorProfile: ["Fruchtig", "Mild", "Malzig", "Spritzig"],
    trivia: "'Turbia' steht auf Spanisch für trüb – ein unfiltriertes Kellerbier aus dem spanischen Aldi-Regal.",
    priceCategory: "mercadona_budget",
    priceEur: 0.55
  },
  {
    name: "Voll-Damm Doble Malta",
    brewery: "Damm",
    origin: "Barcelona (Spanien)",
    style: "Doble Malta",
    abv: 7.2,
    description: "Große grüne Dose ganz rechts oben: 'Das Originale Märzenbier'. Doppeltes Malz, 7,2% vol, mächtig und intensiv.",
    flavorProfile: ["Malzig", "Würzig", "Hopfig-Herb", "Karamell"],
    trivia: "Gewinnt weltweit Goldmedaillen. Das 'Doble Malta' half im 19. Jahrhundert, die Sommerhitze zu überstehen.",
    priceCategory: "premium_craft",
    priceEur: 1.65
  },
  {
    name: "Amstel Oro Tostada",
    brewery: "Amstel España",
    origin: "Spanien / Valencia",
    style: "Märzen / Amber",
    abv: 6.2,
    description: "Goldene Dose mit schwarzem Amstel-Kreis. 100% Röstmalz, dunkles Kupfergold und feine Karamellnoten.",
    flavorProfile: ["Röstig", "Malzig", "Karamell", "Süffig"],
    trivia: "Stand direkt unter der Voll-Damm-Dose! Sehr beliebt in den Bars rund um Valencia und Alicante.",
    priceCategory: "classic_bar",
    priceEur: 1.15
  },
  {
    name: "Mahou Maestra Doble Lúpulo",
    brewery: "Mahou San Miguel",
    origin: "Madrid (Spanien)",
    style: "Doble Malta",
    abv: 7.5,
    description: "Dunkelblaue Dose ganz unten: Meisterbier mit doppeltem Hopfen und satten 7,5% vol. Tief bernsteinfarben.",
    flavorProfile: ["Malzig", "Hopfig-Herb", "Würzig", "Röstig"],
    trivia: "Mit Rösthopfen gebraut – das stärkste Dosenbier auf eurer Küchenzeile!",
    priceCategory: "premium_craft",
    priceEur: 1.75
  },
  {
    name: "Cerdo Volador Session IPA",
    brewery: "Barcelona Beer Company",
    origin: "Barcelona (Spanien)",
    style: "IPA",
    abv: 5.5,
    description: "Auffällige pinke Dose mit fliegendem Schwein! Echtes spanisches Craft Session IPA mit tropischem Hopfen.",
    flavorProfile: ["Fruchtig", "Zitrusfrisch", "Hopfig-Herb", "Spritzig"],
    trivia: "'Wenn Schweine fliegen!' – Das berühmteste katalanische Craft-Bier mit Maracuja- und Mango-Aromen.",
    priceCategory: "premium_craft",
    priceEur: 2.20
  },
  {
    name: "Steinburg Suave (Mercadona)",
    brewery: "Font Salem / Mercadona",
    origin: "Valencia (Spanien)",
    style: "Lager",
    abv: 4.0,
    description: "Weiße Dose mit grünem Stern ganz rechts unten. Mit 4,0% extra leicht und soft gebraut.",
    flavorProfile: ["Mild", "Spritzig", "Süffig"],
    trivia: "Die sanfteste aller Mercadona-Dosen – perfekt für den sonnigen Nachmittag am Finca-Pool.",
    priceCategory: "mercadona_budget",
    priceEur: 0.36
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

    return res.json({
      beers: SPANISH_BEER_DEFAULTS,
      source: 'smart_fallback'
    });
  } catch (error: any) {
    console.error('Error in recognize-beers endpoint:', error);
    return res.json({
      beers: SPANISH_BEER_DEFAULTS,
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
  const distPath = path.join(__dirname, 'dist');
  const indexHtml = path.join(distPath, 'index.html');

  if (process.env.NODE_ENV === 'production' && fs.existsSync(indexHtml)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(503).send('Building... Bitte Seite in 5 Sekunden neu laden.');
      }
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
