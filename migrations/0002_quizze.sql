-- Gespeicherte Quizze, der Inhalt als JSON in einer Spalte (ADR 0002).
-- Wird ein Konto gelöscht, löscht D1 seine Quizze mit.
CREATE TABLE quiz (
  id TEXT PRIMARY KEY,
  besitzer TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  inhalt TEXT NOT NULL,
  spielbar INTEGER NOT NULL,
  geaendert_am INTEGER NOT NULL
);
CREATE INDEX quiz_besitzer_idx ON quiz (besitzer, geaendert_am);
