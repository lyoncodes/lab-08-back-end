DROP TABLE IF EXISTS locations;


CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(8, 6),
  longitude NUMERIC(9, 6)
)
