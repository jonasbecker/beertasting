import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
const rooms = /* @__PURE__ */ new Map();
const clientSockets = /* @__PURE__ */ new Map();
const SPANISH_BEER_DEFAULTS = [
  {
    name: "Stella Artois",
    brewery: "Stella Artois (AB InBev)",
    origin: "Belgien",
    style: "Lager",
    abv: 5,
    description: "Klassisches europ\xE4isches Premium-Lager. Goldgelb, feiner floraler Hopfen und knackig-erfrischender Abgang.",
    flavorProfile: ["Spritzig", "Hopfig-Herb", "Mild", "S\xFCffig"],
    trivia: "Tradition seit 1366 aus Leuven in Belgien. Auf der K\xFCchenzeile ganz links in der edlen gr\xFCnen Flasche mit Goldfolie!",
    priceCategory: "classic_bar",
    priceEur: 1.3
  },
  {
    name: "Corona Cerveza",
    brewery: "Grupo Modelo",
    origin: "Mexiko",
    style: "Lager",
    abv: 4.5,
    description: "Kultige durchsichtige Flasche. Extrem leicht, strohgelb, erfrischend s\xFCffig und sommerlich mild.",
    flavorProfile: ["Mild", "Spritzig", "S\xFCffig", "Zitrusfrisch"],
    trivia: "Das weltber\xFChmte mexikanische Strandbier \u2013 geh\xF6rt zu jedem Urlaub an der spanischen K\xFCste!",
    priceCategory: "classic_bar",
    priceEur: 1.45
  },
  {
    name: "Leffe Blonde",
    brewery: "Abbaye de Leffe",
    origin: "Belgien",
    style: "Anderer Stil",
    abv: 6.6,
    description: "Belgisches Kloster-Blondbier mit gelbem Etikett. Noten von Nelke, s\xFC\xDFem Malz, Vanille und reifem Apfel.",
    flavorProfile: ["Fruchtig", "W\xFCrzig", "Malzig", "S\xFCffig"],
    trivia: "Bereits 1240 von den M\xF6nchen in Dinant gebraut. Kr\xE4ftige 6,6% vol mit eleganter S\xFC\xDFe.",
    priceCategory: "premium_craft",
    priceEur: 1.95
  },
  {
    name: "Erdinger Wei\xDFbier",
    brewery: "Erdinger Wei\xDFbr\xE4u",
    origin: "Deutschland (Bayern)",
    style: "Witbier / Weizen",
    abv: 5.3,
    description: "Klassisches bayerisches Hefeweizen. Feine Hefe-Tr\xFCbung, Bananen- und Nelkenaromen mit stabiler Krone.",
    flavorProfile: ["Fruchtig", "Spritzig", "W\xFCrzig", "Mild"],
    trivia: "Der bayerische Wei\xDFbier-Klassiker auf der spanischen Finca \u2013 ein Genuss zur Siesta!",
    priceCategory: "premium_craft",
    priceEur: 1.8
  },
  {
    name: "Heineken Original",
    brewery: "Heineken",
    origin: "Niederlande",
    style: "Lager",
    abv: 5,
    description: "Gr\xFCne Dose mit rotem Stern. Charakteristische fruchtige Noten durch Heineken A-Hefe, feine Bittere.",
    flavorProfile: ["Spritzig", "Hopfig-Herb", "Mild"],
    trivia: "In Amsterdam 1873 gegr\xFCndet. Stand im Bild oben auf der Dose Karlsquell.",
    priceCategory: "classic_bar",
    priceEur: 1.15
  },
  {
    name: "Karlsquell Suave (Aldi)",
    brewery: "Font Salem / Aldi Espa\xF1a",
    origin: "Spanien",
    style: "Lager",
    abv: 4.8,
    description: "Wei\xDF-gr\xFCne Dose von Aldi Spanien. Extrem schlanker K\xF6rper, minimale Bittere, maximaler Durstl\xF6scher.",
    flavorProfile: ["Mild", "Spritzig", "S\xFCffig"],
    trivia: "Der 35-Cent-Preishit von Aldi Spanien \u2013 stand direkt unter der Heineken-Dose!",
    priceCategory: "mercadona_budget",
    priceEur: 0.35
  },
  {
    name: "Steinburg Especial (Mercadona)",
    brewery: "Font Salem / Mercadona",
    origin: "Valencia (Spanien)",
    style: "Lager",
    abv: 5.6,
    description: "Rote Dose mit goldenem Stern aus dem Mercadona. Kr\xE4ftiger und malziger als die gr\xFCne Cl\xE1sica.",
    flavorProfile: ["Malzig", "S\xFCffig", "Spritzig"],
    trivia: "Die rote 'Especial'-Variante von Mercadona f\xFCr nur 42 Cent \u2013 gef\xE4hrlich s\xFCffig mit 5,6%!",
    priceCategory: "mercadona_budget",
    priceEur: 0.42
  },
  {
    name: "Steinburg Cl\xE1sica (Mercadona)",
    brewery: "Font Salem / Mercadona",
    origin: "Valencia (Spanien)",
    style: "Lager",
    abv: 4.8,
    description: "Die dunkelgr\xFCne Kult-Dose von Mercadona f\xFCr 38 Cent. Leicht, erfrischend und treuer Begleiter jeder Finca.",
    flavorProfile: ["Mild", "Spritzig", "S\xFCffig"],
    trivia: "Das beliebteste Billigbier Spaniens \u2013 stand unter der roten Steinburg Especial!",
    priceCategory: "mercadona_budget",
    priceEur: 0.38
  },
  {
    name: "Charles Quint St-Michel",
    brewery: "Brouwerij Haacht",
    origin: "Belgien",
    style: "Anderer Stil",
    abv: 6.1,
    description: "Braune Flasche mit dem Portr\xE4t von Kaiser Karl V. Aromatisch, hefebetont mit Zitrus- und Gew\xFCrznoten.",
    flavorProfile: ["Fruchtig", "W\xFCrzig", "Hopfig-Herb", "Malzig"],
    trivia: "Kaiser Karl V. wuchs in Flandern auf und liebte belgisches Bier so sehr, dass er es nach Spanien importieren lie\xDF.",
    priceCategory: "premium_craft",
    priceEur: 2.1
  },
  {
    name: "Mescalina M\xE9xico (Cerveza + Mezcal)",
    brewery: "Cervezas Especiales",
    origin: "Spanien / Mexiko-Style",
    style: "Anderer Stil",
    abv: 4.5,
    description: "Dunkle Flasche mit t\xFCrkis-gelbem Etikett. Verfeinert mit mexikanischem Mezcal und Agavengeschmack.",
    flavorProfile: ["W\xFCrzig", "S\xFCffig", "R\xF6stig", "Spritzig"],
    trivia: "Der verr\xFCckteste Exot auf eurer K\xFCchenzeile! Bringt eine feine rauchige Mezcal-Note ins Bier.",
    priceCategory: "classic_bar",
    priceEur: 1.7
  },
  {
    name: "Birra Moretti L'Autentica",
    brewery: "Birra Moretti (Heineken Italia)",
    origin: "Italien",
    style: "Lager",
    abv: 4.6,
    description: "Italienisches Traditionslager mit dem trinkenden Mann mit gr\xFCnem Hut auf dem Etikett. Mild, leicht malzig.",
    flavorProfile: ["Mild", "Malzig", "Spritzig", "S\xFCffig"],
    trivia: "Das Etikett zeigt einen Herrn, den der Brauereichef 1942 in Udine fotografierte \u2013 sein Lohn war ein Bier!",
    priceCategory: "classic_bar",
    priceEur: 1.35
  },
  {
    name: "18/70 La Rubia",
    brewery: "18/70 (Heineken Espa\xF1a)",
    origin: "Baskenland (Spanien)",
    style: "Helles Bock",
    abv: 6.2,
    description: "Dunkle Flasche mit markanter wei\xDFer '18/70'-Aufschrift. Kr\xE4ftiges blondes Lager mit 6,2% und vollem Malzk\xF6rper.",
    flavorProfile: ["Malzig", "Hopfig-Herb", "W\xFCrzig", "S\xFCffig"],
    trivia: "Startete als Geheimtipp in baskischen Kneipen in Donostia / San Sebasti\xE1n und wurde zum spanischen Kultbier.",
    priceCategory: "premium_craft",
    priceEur: 1.65
  },
  {
    name: "Maternus Turbia (Aldi)",
    brewery: "Maternus (Aldi Espa\xF1a)",
    origin: "Spanien / Deutschland",
    style: "Witbier / Weizen",
    abv: 5,
    description: "Braune Flasche mit wei\xDFem L\xE4ngsetikett. Unfiltriertes, naturtr\xFCbes Zwickel-Bier mit vollmundiger Hefe.",
    flavorProfile: ["Fruchtig", "Mild", "Malzig", "Spritzig"],
    trivia: "'Turbia' steht auf Spanisch f\xFCr tr\xFCb \u2013 ein unfiltriertes Kellerbier aus dem spanischen Aldi-Regal.",
    priceCategory: "mercadona_budget",
    priceEur: 0.55
  },
  {
    name: "Voll-Damm Doble Malta",
    brewery: "Damm",
    origin: "Barcelona (Spanien)",
    style: "Doble Malta",
    abv: 7.2,
    description: "Gro\xDFe gr\xFCne Dose ganz rechts oben: 'Das Originale M\xE4rzenbier'. Doppeltes Malz, 7,2% vol, m\xE4chtig und intensiv.",
    flavorProfile: ["Malzig", "W\xFCrzig", "Hopfig-Herb", "Karamell"],
    trivia: "Gewinnt weltweit Goldmedaillen. Das 'Doble Malta' half im 19. Jahrhundert, die Sommerhitze zu \xFCberstehen.",
    priceCategory: "premium_craft",
    priceEur: 1.65
  },
  {
    name: "Amstel Oro Tostada",
    brewery: "Amstel Espa\xF1a",
    origin: "Spanien / Valencia",
    style: "M\xE4rzen / Amber",
    abv: 6.2,
    description: "Goldene Dose mit schwarzem Amstel-Kreis. 100% R\xF6stmalz, dunkles Kupfergold und feine Karamellnoten.",
    flavorProfile: ["R\xF6stig", "Malzig", "Karamell", "S\xFCffig"],
    trivia: "Stand direkt unter der Voll-Damm-Dose! Sehr beliebt in den Bars rund um Valencia und Alicante.",
    priceCategory: "classic_bar",
    priceEur: 1.15
  },
  {
    name: "Mahou Maestra Doble L\xFApulo",
    brewery: "Mahou San Miguel",
    origin: "Madrid (Spanien)",
    style: "Doble Malta",
    abv: 7.5,
    description: "Dunkelblaue Dose ganz unten: Meisterbier mit doppeltem Hopfen und satten 7,5% vol. Tief bernsteinfarben.",
    flavorProfile: ["Malzig", "Hopfig-Herb", "W\xFCrzig", "R\xF6stig"],
    trivia: "Mit R\xF6sthopfen gebraut \u2013 das st\xE4rkste Dosenbier auf eurer K\xFCchenzeile!",
    priceCategory: "premium_craft",
    priceEur: 1.75
  },
  {
    name: "Cerdo Volador Session IPA",
    brewery: "Barcelona Beer Company",
    origin: "Barcelona (Spanien)",
    style: "IPA",
    abv: 5.5,
    description: "Auff\xE4llige pinke Dose mit fliegendem Schwein! Echtes spanisches Craft Session IPA mit tropischem Hopfen.",
    flavorProfile: ["Fruchtig", "Zitrusfrisch", "Hopfig-Herb", "Spritzig"],
    trivia: "'Wenn Schweine fliegen!' \u2013 Das ber\xFChmteste katalanische Craft-Bier mit Maracuja- und Mango-Aromen.",
    priceCategory: "premium_craft",
    priceEur: 2.2
  },
  {
    name: "Steinburg Suave (Mercadona)",
    brewery: "Font Salem / Mercadona",
    origin: "Valencia (Spanien)",
    style: "Lager",
    abv: 4,
    description: "Wei\xDFe Dose mit gr\xFCnem Stern ganz rechts unten. Mit 4,0% extra leicht und soft gebraut.",
    flavorProfile: ["Mild", "Spritzig", "S\xFCffig"],
    trivia: "Die sanfteste aller Mercadona-Dosen \u2013 perfekt f\xFCr den sonnigen Nachmittag am Finca-Pool.",
    priceCategory: "mercadona_budget",
    priceEur: 0.36
  }
];
function broadcastToRoom(roomCode, payload) {
  const jsonStr = JSON.stringify(payload);
  clientSockets.forEach((meta, ws) => {
    if (meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(jsonStr);
    }
  });
}
app.post("/api/room/create", (req, res) => {
  const { hostPlayer, session } = req.body;
  if (!hostPlayer || !session) {
    return res.status(400).json({ error: "hostPlayer und session erforderlich." });
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const room = {
    code,
    hostId: hostPlayer.id,
    stage: "LOBBY",
    currentBeerIndex: 0,
    players: [
      {
        id: hostPlayer.id,
        name: hostPlayer.name,
        nickname: hostPlayer.nickname || "Host",
        avatarEmoji: hostPlayer.avatarEmoji || "\u{1F451}",
        isHost: true,
        hasSubmitted: false
      }
    ],
    currentRoundRatings: {},
    session: {
      ...session,
      playMode: "multiplayer",
      roomCode: code,
      players: [hostPlayer]
    }
  };
  rooms.set(code, room);
  res.json({ room });
});
app.post("/api/room/join", (req, res) => {
  const { roomCode, player } = req.body;
  if (!roomCode || !player) {
    return res.status(400).json({ error: "roomCode und player erforderlich." });
  }
  const normalizedCode = roomCode.trim().toUpperCase();
  const room = rooms.get(normalizedCode);
  if (!room) {
    return res.status(404).json({ error: `Raum "${normalizedCode}" wurde nicht gefunden.` });
  }
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
      nickname: player.nickname || "Sommelier",
      avatarEmoji: player.avatarEmoji || "\u{1F37A}",
      isHost: false,
      hasSubmitted: false
    });
    if (!room.session.players.some((p) => p.id === player.id)) {
      room.session.players.push(player);
    }
  }
  rooms.set(normalizedCode, room);
  broadcastToRoom(normalizedCode, { type: "ROOM_UPDATE", room });
  res.json({ room });
});
app.get("/api/room/:code", (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "Raum nicht gefunden." });
  }
  res.json({ room });
});
app.post("/api/room/action", (req, res) => {
  const { roomCode, action, payload } = req.body;
  if (!roomCode || !action) {
    return res.status(400).json({ error: "roomCode und action erforderlich." });
  }
  const normalizedCode = roomCode.trim().toUpperCase();
  const room = rooms.get(normalizedCode);
  if (!room) {
    return res.status(404).json({ error: "Raum nicht gefunden." });
  }
  switch (action) {
    case "START_GAME":
      room.stage = "TASTING";
      room.currentBeerIndex = 0;
      room.currentRoundRatings = {};
      room.players.forEach((p) => p.hasSubmitted = false);
      break;
    case "SUBMIT_RATING": {
      const { playerId, rating } = payload;
      room.currentRoundRatings[playerId] = rating;
      const p = room.players.find((pl) => pl.id === playerId);
      if (p) p.hasSubmitted = true;
      const allSubmitted = room.players.every((pl) => pl.hasSubmitted);
      if (allSubmitted) {
        room.stage = "PRE_REVEAL";
      }
      break;
    }
    case "START_DRUMROLL":
      room.stage = "DRUMROLL";
      break;
    case "SHOW_REVEAL":
      room.stage = "REVEAL";
      break;
    case "TRIGGER_MINIGAME":
      room.stage = "MINIGAME";
      room.currentMinigame = payload.minigame;
      break;
    case "TRIGGER_HIDRATADOR":
      room.stage = "HIDRATADOR";
      break;
    case "NEXT_BEER":
      room.stage = "TASTING";
      room.currentBeerIndex = payload.nextBeerIndex ?? room.currentBeerIndex + 1;
      room.currentRoundRatings = {};
      room.currentMinigame = void 0;
      room.players.forEach((pl) => pl.hasSubmitted = false);
      break;
    case "SHOW_FINAL":
      room.stage = "FINAL";
      break;
    case "SYNC_SESSION":
      room.session = payload.session;
      break;
    default:
      break;
  }
  rooms.set(normalizedCode, room);
  broadcastToRoom(normalizedCode, { type: "ROOM_UPDATE", room });
  res.json({ room });
});
app.post("/api/recognize-beers", async (req, res) => {
  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Keine Bilder bereitgestellt." });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim().length > 5;
    if (hasValidKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        const imageParts = [];
        images.forEach((img) => {
          let base64 = img.data || "";
          let mimeType = img.mimeType || "image/jpeg";
          if (base64.includes(";base64,")) {
            const split = base64.split(";base64,");
            mimeType = split[0].replace("data:", "") || mimeType;
            base64 = split[1];
          }
          imageParts.push({
            inlineData: {
              mimeType,
              data: base64
            }
          });
        });
        const promptText = `Du bist ein erfahrener spanischer Biersommelier an der Costa Blanca (X\xE0bia / J\xE1vea).
Analysiere die Fotos von Bierflaschen oder Dosen.
Identifiziere alle sichtbaren Biere (z.B. Alhambra, Turia, Estrella Galicia, Mahou, Voll-Damm, Inedit, Cruzcampo, 1906, etc.).
Liefere ein valides JSON-Array zur\xFCck:
- name: Genauer Biername
- brewery: Brauerei / Marke
- origin: Spanische Region
- style: Einer von ["Lager", "M\xE4rzen / Amber", "Pilsner", "Helles Bock", "Doble Malta", "IPA", "Witbier / Weizen", "Anderer Stil"]
- abv: Zahl (z.B. 5.5)
- description: Knackige Geschmacksbeschreibung in 1 pr\xE4gnanten Satz
- flavorProfile: Array aus 3 bis 4 Geschmacksnoten ausschlie\xDFlich aus: ["Malzig", "Hopfig-Herb", "Fruchtig", "Karamell", "S\xFCffig", "Spritzig", "R\xF6stig", "Zitrusfrisch", "Mild", "W\xFCrzig"]
- trivia: Eine humorvolle Anekdote oder Fun-Fact zu diesem Bier f\xFCr die Jungs am Tisch`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              role: "user",
              parts: [
                ...imageParts,
                { text: promptText }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
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
                      "M\xE4rzen / Amber",
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
        let cleanText = (response.text || "").trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        const parsedBeers = JSON.parse(cleanText);
        if (Array.isArray(parsedBeers) && parsedBeers.length > 0) {
          return res.json({ beers: parsedBeers, source: "gemini_vision" });
        }
      } catch (geminiError) {
        console.warn("Gemini vision API call failed, falling back to smart defaults:", geminiError?.message || geminiError);
      }
    }
    return res.json({
      beers: SPANISH_BEER_DEFAULTS,
      source: "smart_fallback"
    });
  } catch (error) {
    console.error("Error in recognize-beers endpoint:", error);
    return res.json({
      beers: SPANISH_BEER_DEFAULTS,
      source: "smart_fallback"
    });
  }
});
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
        return;
      }
      if (msg.type === "SUBSCRIBE_ROOM" && msg.roomCode) {
        const code = msg.roomCode.trim().toUpperCase();
        clientSockets.set(ws, { roomCode: code, playerId: msg.playerId || "" });
        const room = rooms.get(code);
        if (room) {
          ws.send(JSON.stringify({ type: "ROOM_UPDATE", room }));
        }
      }
      if (msg.type === "EMOJI_BUZZER" && msg.roomCode) {
        const code = msg.roomCode.trim().toUpperCase();
        broadcastToRoom(code, {
          type: "LIVE_REACTION",
          reactionType: "emoji",
          emoji: msg.emoji,
          senderName: msg.senderName || "Mitspieler",
          id: Date.now() + "-" + Math.random().toString(36).substring(2, 7)
        });
      }
      if (msg.type === "SOUND_TRIGGER" && msg.roomCode) {
        const code = msg.roomCode.trim().toUpperCase();
        broadcastToRoom(code, {
          type: "LIVE_REACTION",
          reactionType: "sound",
          sound: msg.sound,
          senderName: msg.senderName || "Mitspieler",
          id: Date.now() + "-" + Math.random().toString(36).substring(2, 7)
        });
      }
    } catch (e) {
      console.error("WebSocket message parsing error:", e);
    }
  });
  ws.on("close", () => {
    clientSockets.delete(ws);
  });
});
async function startServer() {
  const hasDist = fs.existsSync(path.join(__dirname, "dist", "index.html"));
  if (process.env.NODE_ENV === "production" || hasDist) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`
\u{1F37B} Bier-Tasting Server l\xE4uft auf Port ${PORT}!`);
    console.log(`\u{1F449} Lokal: http://localhost:${PORT}`);
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(`\u{1F4F1} Handy im selben WLAN: http://${net.address}:${PORT}`);
        }
      }
    }
  });
}
startServer();
