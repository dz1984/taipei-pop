CREATE TABLE taipei_pop
(
  block character(10),
  road character(30),
  road_no character(20),
  land_no character(20),
  ser_no01 character(10),
  ser_no02 character(10),
  area numeric(10,3),
  unit text,
  id character(40),
  locations point,
  geo_json json,
  renew_status character(50),
  renew_detail text,
  upload_image character(50)
);