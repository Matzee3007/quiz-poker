import type { Quiz } from "./partie";

export const BEISPIEL_QUIZ: Quiz = {
  titel: "Beispiel-Quiz",
  kategorien: [
    {
      name: "Geographie",
      fragen: [
        {
          text: "Wie heißt die Hauptstadt von Australien?",
          musterloesung: "Canberra",
        },
        {
          text: "Wie heißt der größte Ozean der Erde?",
          musterloesung: "Pazifik",
        },
        {
          text: "Wie viele Bundesländer hat Deutschland?",
          musterloesung: "16",
        },
      ],
    },
    {
      name: "Sport",
      fragen: [
        {
          text: "Wie viele Spieler einer Fußballmannschaft stehen zu Beginn auf dem Feld?",
          musterloesung: "11",
        },
        {
          text: "Wie viele Ringe zeigt die olympische Flagge?",
          musterloesung: "5",
        },
        {
          text: "In welcher Sportart gibt es den Slam Dunk?",
          musterloesung: "Basketball",
        },
      ],
    },
    {
      name: "Gaming",
      fragen: [
        {
          text: "Wie heißt der berühmte Klempner von Nintendo?",
          musterloesung: "Mario",
        },
        {
          text: "Welche Farbe hat Pac-Man?",
          musterloesung: "Gelb",
        },
        {
          text: "In welchem Spiel baut man Welten aus Blöcken und trifft auf Creeper?",
          musterloesung: "Minecraft",
        },
      ],
    },
  ],
};
