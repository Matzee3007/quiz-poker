-- Öffentliche Quizze: Zeitpunkt des Veröffentlichens in Millisekunden, NULL heißt privat.
-- Vorhandene Quizze bleiben privat. Der Teilindex enthält nur öffentliche Quizze, für die Sammlung.
ALTER TABLE quiz ADD COLUMN oeffentlich_seit INTEGER;
CREATE INDEX quiz_oeffentlich_idx ON quiz (oeffentlich_seit, id) WHERE oeffentlich_seit IS NOT NULL;
