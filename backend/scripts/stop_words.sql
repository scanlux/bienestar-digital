USE marketplace_db;
CREATE TABLE IF NOT EXISTS stop_words (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  word VARCHAR(50) UNIQUE NOT NULL, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO stop_words (word) VALUES 
('el'), ('la'), ('los'), ('las'), ('un'), ('una'), ('unos'), ('unas'), 
('con'), ('de'), ('del'), ('para'), ('por'), ('en'), ('y'), ('e'), ('o'), ('u'),
('delicioso'), ('rico'), ('exquisito'), ('mejor'), ('calidad'), ('fresco'), ('frescos'),
('preparado'), ('seleccionado'), ('garantizar'), ('nuestro'), ('vuestra'),
('instante'), ('ingredientes'), ('preparados'), ('casa'), ('casero'), ('especial'),
('sobre'), ('entre'), ('esta'), ('este'), ('estos'), ('estas'), ('desde'), ('hasta');
