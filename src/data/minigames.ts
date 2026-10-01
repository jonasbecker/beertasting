import { Minigame, PartyMode } from '../types';

export const PARTY_MODES: PartyMode[] = [
  {
    id: 'fiesta_standard',
    name: 'Costa Blanca Fiesta',
    tagline: 'Geschmack, Sorte & Geschmacksnoten mit Speed-Bonus',
    description: 'Bierstil tippen (+50 Pkt), passende Geschmacksnoten treffen (+10 Pkt je Treffer) und schnelle Schlucke mit Speed-Bonus belohnen.',
    speedBonusActive: true,
    maxSpeedBonus: 25,
    speedCutoffSeconds: 20,
    styleAccuracyPoints: 50,
    flavorMatchPoints: 10,
    penaltySipsOnWrongGuess: 1
  },
  {
    id: 'sommelier_pro',
    name: 'Sommelier Modus',
    tagline: 'Voller Fokus auf Stil & Geschmacksnoten ohne Hektik',
    description: 'Kein Zeitdruck. Doppelte Punkte für den richtigen Bierstil (+80 Pkt) und +15 Pkt je passende Geschmacksnote.',
    speedBonusActive: false,
    maxSpeedBonus: 0,
    speedCutoffSeconds: 60,
    styleAccuracyPoints: 80,
    flavorMatchPoints: 15,
    penaltySipsOnWrongGuess: 0
  },
  {
    id: 'speedrun_xabia',
    name: 'Speedrun Xàbia',
    tagline: 'Schnell trinken, direkt tippen!',
    description: 'Bis zu +40 Speed-Punkte bei Raten unter 10 Sekunden. Wer trödelt, bekommt 0 Speed-Punkte.',
    speedBonusActive: true,
    maxSpeedBonus: 40,
    speedCutoffSeconds: 15,
    styleAccuracyPoints: 40,
    flavorMatchPoints: 10,
    penaltySipsOnWrongGuess: 2
  },
  {
    id: 'penalty_shots',
    name: 'Strafschluck-Modus',
    tagline: 'Falscher Bierstil = Strafschlucke!',
    description: 'Liegt man beim Bierstil daneben, muss man sofort 2 Strafschlucke trinken.',
    speedBonusActive: true,
    maxSpeedBonus: 20,
    speedCutoffSeconds: 20,
    styleAccuracyPoints: 60,
    flavorMatchPoints: 10,
    penaltySipsOnWrongGuess: 2
  }
];

export const MINIGAMES: Minigame[] = [
  {
    id: 'mg-medusa',
    title: 'Medusa',
    category: 'Reaktion',
    durationMinutes: 1,
    tagline: 'Wer sich in die Augen schaut, trinkt!',
    shortDescription: 'Kopf runter auf den Tisch. Auf "Tres, dos, uno" alle hochschauen. Wer direkten Blickkontakt hat, ruft MEDUSA und trinkt!',
    instructions: [
      'Alle 4 stützen die Ellenbogen auf und senken den Kopf auf den Tisch.',
      'Ausschenker zählt: "Tres, dos, uno... YA!"',
      'Alle schauen ruckartig genau einen Mitspieler an.',
      'Treffen sich 2 Augenpaare: Beide trinken sofort!'
    ],
    penalty: 'Beide Blickkontakt-Partner trinken 2 Schlucke.'
  },
  {
    id: 'mg-wer-wuerde-eher',
    title: 'Wer würde eher... (Jávea)',
    category: 'Verbal',
    durationMinutes: 1,
    tagline: 'Die Urlaubs-Wahrheit über die 4 Jungs.',
    shortDescription: 'Frage vorlesen, auf 3 zeigen alle gleichzeitig auf den Schuldigen. Die meisten Stimmen trinken!',
    instructions: [
      'Zufallsfrage vorlesen.',
      'Auf "3, 2, 1" zeigt jeder auf einen Mitspieler.',
      'Der mit den meisten Fingern auf sich trinkt!'
    ],
    penalty: 'Meistgewählter trinkt 2 Schlucke.'
  },
  {
    id: 'mg-xabia-koffer',
    title: 'Kofferpacken Xàbia',
    category: 'Verbal',
    durationMinutes: 2,
    tagline: 'Spanische Begriffe merken – fehlerfrei oder Prost!',
    shortDescription: 'Reihum: "Ich packe in Xàbia ein...". Nur spanische Dinge, Tapas oder Biere erlaubt. Wer zögert, trinkt!',
    instructions: [
      'Reihum jeweils einen spanischen Begriff anhängen (z.B. Alhambra, Pimientos, Sonnenschirm, Turia).',
      'Wer länger als 4 Sekunden stockt oder einen Begriff vergisst, hat verloren.'
    ],
    penalty: 'Verlierer trinkt 2 Schlucke.'
  },
  {
    id: 'mg-stierkampf',
    title: 'El Toro',
    category: 'Reaktion',
    durationMinutes: 2,
    tagline: 'Schnellste Reaktion am Tisch.',
    shortDescription: 'Ausschenker nennt eine Kategorie (z.B. "Dinge, die man betrunken am Strand macht"). Im Takt neues Wort nennen!',
    instructions: [
      'Ausschenker gibt die Kategorie vor.',
      'Im Uhrzeigersinn schnippen alle den Takt und nennen passendes Wort.',
      'Keine Wiederholungen, kein Zögern!'
    ],
    penalty: 'Verlierer trinkt 2 Schlucke.'
  },
  {
    id: 'mg-sommelier-rede',
    title: 'Sommelier-Stegreif',
    category: 'Verbal',
    durationMinutes: 1,
    tagline: '30 Sekunden übertriebene Weinkenner-Lobrede.',
    shortDescription: 'Der Spieler mit den wenigsten Punkten muss das letzte Bier 30 Sekunden lang wie ein 3-Sterne-Sommelier anpreisen.',
    instructions: [
      'Verlierer steht auf und preist das Bier mit Gourmet-Fachbegriffen.',
      'Wenn er selbst lachen muss, trinkt er!'
    ],
    penalty: 'Lacht er selbst: 2 Schlucke.'
  }
];

export const WER_WUERDE_EHER_PROMPTS = [
  'Wer würde eher betrunken auf Spanisch mit Straßenmusikern verhandeln?',
  'Wer würde eher seinen Schlüssel im Mittelmeer versenken?',
  'Wer würde eher am nächsten Morgen behaupten: "Ich hab gestern fast nichts getrunken"?',
  'Wer würde eher im Supermarkt aus Versehen alkoholfreies Bier kaufen?',
  'Wer würde eher nachts spontan nackt in den Pool springen?',
  'Wer würde eher am Strand einschlafen und krebsrot aufwachen?',
  'Wer würde eher in einer Gourmet-Weinbar nach einem Pils fragen?'
];
