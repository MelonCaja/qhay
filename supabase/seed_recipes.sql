-- ════════════════════════════════════════════════════════════════════════════
-- QHAY — SEED DE RECETAS (50) · relacional recipes ← recipe_ingredients
-- Idempotente: borra el seed previo (toda receta con category de GUSTOS) y
-- reinserta. category usa los ids EXACTOS del onboarding; restrictions son
-- etiquetas de APTITUD (vegetariano|vegano|sin-gluten|sin-lactosa);
-- utensils_required usa ids del onboarding (olla|sarten|horno|microondas|
-- licuadora|hervidor|airfryer|tostadora). Ingredientes en minúsculas/español
-- para el cruce con pantries (RPC usa unaccent → tildes OK).
-- Requiere schema.sql aplicado (columna recipes.category).
-- ════════════════════════════════════════════════════════════════════════════

begin;

delete from public.recipes
 where category in ('chileno','italiano','asiatico','mexicano','fitness','dulce','picante','economico');

-- ─── CHILENAS (7) ────────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Pastel de choclo', 'El clásico de fondas: pino de carne y pollo bajo una capa dorada de choclo molido con albahaca.',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe la cebolla picada con la carne molida, comino, sal y pimienta hasta formar el pino."},{"numero":2,"descripcion":"Muele el choclo con albahaca y leche; cocina la pasta en olla hasta espesar."},{"numero":3,"descripcion":"En una fuente pon pino, presas de pollo cocido, huevo duro y aceitunas; cubre con la pasta de choclo."},{"numero":4,"descripcion":"Espolvorea azúcar y hornea a 200°C por 30 minutos hasta dorar.","timerSegundos":1800}]'::jsonb,
    '{olla,horno}', 75, 'media', 4, 620, '{"proteinas":32,"carbohidratos":58,"grasas":28}'::jsonb,
    false, false, '{sin-gluten}', '{verano}', 'chileno')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('choclo', 6, 'unidad', '6 choclos o 1 kg congelado', false),
  ('carne molida', 500, 'g', '2 tazas', false),
  ('pollo', 2, 'unidad', '2 presas cocidas', false),
  ('cebolla', 2, 'unidad', '2 unidades', false),
  ('huevo', 2, 'unidad', '2 huevos duros', false),
  ('leche', 250, 'ml', '1 taza', false),
  ('albahaca', 1, 'unidad', '1 ramita', false),
  ('aceituna', 8, 'unidad', '1 puñado', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Empanadas de pino', 'Empanadas horneadas rellenas de pino jugoso con huevo, aceituna y pasas.',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Prepara el pino: sofríe cebolla en cubos con carne molida, ají de color, comino y sal; deja enfriar."},{"numero":2,"descripcion":"Haz la masa con harina, manteca derretida, sal y agua tibia; amasa y deja reposar."},{"numero":3,"descripcion":"Uslerea discos, rellena con pino, huevo duro, aceituna y pasas; cierra las empanadas."},{"numero":4,"descripcion":"Pincela con huevo y hornea a 220°C por 25 minutos.","timerSegundos":1500}]'::jsonb,
    '{horno}', 90, 'dificil', 6, 480, '{"proteinas":20,"carbohidratos":52,"grasas":22}'::jsonb,
    false, false, '{sin-lactosa}', '{}', 'chileno')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('harina', 500, 'g', '4 tazas', false),
  ('carne molida', 400, 'g', '2 tazas', false),
  ('cebolla', 3, 'unidad', '3 unidades', false),
  ('manteca', 100, 'g', 'media taza', false),
  ('huevo', 3, 'unidad', '2 duros + 1 para pincelar', false),
  ('aceituna', 6, 'unidad', '1 por empanada', false),
  ('pasas', 30, 'g', '1 puñado', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Cazuela de pollo', 'Sopa contundente con presa de pollo, papa, zapallo, choclo y arroz: abrigo puro.',
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Dora las presas de pollo en la olla con cebolla, ajo y zanahoria."},{"numero":2,"descripcion":"Agrega agua caliente, sal, orégano y cocina 20 minutos.","timerSegundos":1200},{"numero":3,"descripcion":"Suma papa, zapallo, choclo y arroz; cocina hasta que todo esté blando."},{"numero":4,"descripcion":"Sirve caliente con cilantro picado encima."}]'::jsonb,
    '{olla}', 60, 'facil', 4, 450, '{"proteinas":35,"carbohidratos":48,"grasas":12}'::jsonb,
    false, true, '{sin-gluten,sin-lactosa}', '{invierno,otoño}', 'chileno')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('pollo', 4, 'unidad', '4 presas', false),
  ('papa', 4, 'unidad', '1 por persona', false),
  ('zapallo', 400, 'g', '4 trozos', false),
  ('choclo', 2, 'unidad', '2 unidades en mitades', false),
  ('arroz', 60, 'g', 'un tercio de taza', false),
  ('zanahoria', 1, 'unidad', '1 unidad', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('cilantro', 1, 'unidad', '1 ramita', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Porotos granados', 'Porotos frescos con mazamorra de choclo, zapallo y albahaca: verano chileno en plato hondo.',
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla y ajo con ají de color en la olla."},{"numero":2,"descripcion":"Agrega porotos, zapallo en cubos y agua caliente; cocina 25 minutos.","timerSegundos":1500},{"numero":3,"descripcion":"Suma el choclo rallado o molido con albahaca y cocina hasta espesar la mazamorra."}]'::jsonb,
    '{olla}', 60, 'facil', 4, 420, '{"proteinas":18,"carbohidratos":68,"grasas":8}'::jsonb,
    false, true, '{vegetariano,vegano,sin-gluten,sin-lactosa}', '{verano}', 'chileno')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('porotos', 500, 'g', '3 tazas cocidos', false),
  ('choclo', 4, 'unidad', '4 unidades o 500 g congelado', false),
  ('zapallo', 300, 'g', '3 trozos', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('albahaca', 1, 'unidad', '1 ramita generosa', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Charquicán', 'Guiso de papa y zapallo molidos con carne, choclo y arvejas; con huevo frito arriba es gloria.',
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla, ajo y carne molida con comino y ají de color."},{"numero":2,"descripcion":"Agrega papa y zapallo en cubos con poca agua; cocina hasta ablandar y muele grueso."},{"numero":3,"descripcion":"Incorpora choclo y arvejas, rectifica sal y sirve con huevo frito encima."}]'::jsonb,
    '{olla,sarten}', 45, 'facil', 4, 480, '{"proteinas":26,"carbohidratos":52,"grasas":18}'::jsonb,
    false, true, '{sin-gluten,sin-lactosa}', '{}', 'chileno')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('papa', 5, 'unidad', '5 unidades', false),
  ('zapallo', 300, 'g', '3 trozos', false),
  ('carne molida', 300, 'g', '1 taza y media', false),
  ('choclo', 1, 'taza', '1 taza desgranado', false),
  ('arvejas', 1, 'taza', '1 taza', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('huevo', 4, 'unidad', '1 por persona', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Sopaipillas caseras', 'Discos fritos de masa con zapallo: solas, pasadas o con pebre, siempre funcionan.',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cuece el zapallo y hazlo puré."},{"numero":2,"descripcion":"Mezcla con harina, manteca derretida y sal hasta formar una masa suave."},{"numero":3,"descripcion":"Uslerea, corta discos, pínchalos y fríelos en aceite caliente hasta dorar."}]'::jsonb,
    '{olla}', 40, 'facil', 6, 380, '{"proteinas":6,"carbohidratos":54,"grasas":16}'::jsonb,
    false, true, '{vegetariano,sin-lactosa}', '{invierno}', 'chileno')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('zapallo', 250, 'g', '1 taza de puré', false),
  ('harina', 500, 'g', '4 tazas', false),
  ('manteca', 60, 'g', '3 cucharadas', false),
  ('aceite', 500, 'ml', 'para freír', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Lomo a lo pobre', 'Lomo jugoso sobre cama de papas fritas, coronado con cebolla caramelizada y huevos fritos.',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Fríe las papas en bastones hasta dorar y reserva calientes."},{"numero":2,"descripcion":"Carameliza la cebolla en pluma a fuego medio."},{"numero":3,"descripcion":"Sella el lomo al punto deseado y fríe los huevos; monta todo en ese orden."}]'::jsonb,
    '{sarten}', 35, 'media', 2, 850, '{"proteinas":48,"carbohidratos":62,"grasas":42}'::jsonb,
    false, false, '{sin-gluten,sin-lactosa}', '{}', 'chileno')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('lomo', 400, 'g', '2 bistecs gruesos', false),
  ('papa', 4, 'unidad', '4 unidades grandes', false),
  ('cebolla', 2, 'unidad', '2 unidades en pluma', false),
  ('huevo', 4, 'unidad', '2 por persona', false),
  ('aceite', 300, 'ml', 'para freír', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

-- ─── ECONÓMICAS (7) ──────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Arroz con huevo gourmet', 'El clásico de emergencia elevado: arroz salteado con ajo, huevo con yema líquida y cebollín.',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cocina el arroz graneado o usa arroz frío del día anterior."},{"numero":2,"descripcion":"Saltea ajo picado en la sartén, agrega el arroz y un chorro de salsa de soya."},{"numero":3,"descripcion":"Fríe el huevo dejando la yema líquida, móntalo sobre el arroz y termina con cebollín y sésamo."}]'::jsonb,
    '{olla,sarten}', 20, 'facil', 1, 520, '{"proteinas":18,"carbohidratos":72,"grasas":16}'::jsonb,
    false, true, '{vegetariano,sin-lactosa}', '{}', 'economico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('arroz', 100, 'g', 'media taza cruda', false),
  ('huevo', 2, 'unidad', '2 unidades', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('cebollín', 1, 'unidad', '1 tallo', false),
  ('salsa de soya', 15, 'ml', '1 cucharada', false),
  ('aceite de sésamo', 5, 'ml', '1 cucharadita', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Lentejas con arroz', 'Guiso de lentejas con sofrito de verduras y arroz: proteína completa por monedas.',
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla, zanahoria y ajo con comino y ají de color."},{"numero":2,"descripcion":"Agrega las lentejas remojadas y agua caliente; cocina 30 minutos.","timerSegundos":1800},{"numero":3,"descripcion":"Suma el arroz y cocina 15 minutos más hasta que todo esté blando."}]'::jsonb,
    '{olla}', 40, 'facil', 4, 410, '{"proteinas":22,"carbohidratos":70,"grasas":4}'::jsonb,
    false, true, '{vegetariano,vegano,sin-gluten,sin-lactosa}', '{invierno,otoño}', 'economico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('lentejas', 300, 'g', '1 taza y media', false),
  ('arroz', 100, 'g', 'media taza', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('zanahoria', 1, 'unidad', '1 unidad', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('comino', 1, 'cucharadita', '1 cucharadita', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Tortilla de papas', 'Tortilla española de papa y cebolla: 3 ingredientes, cena resuelta.',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Fríe la papa en láminas con la cebolla a fuego suave hasta ablandar."},{"numero":2,"descripcion":"Escurre, mezcla con los huevos batidos y sal; reposa 5 minutos.","timerSegundos":300},{"numero":3,"descripcion":"Cuaja en sartén a fuego medio y da vuelta con un plato para dorar ambos lados."}]'::jsonb,
    '{sarten}', 30, 'facil', 3, 380, '{"proteinas":16,"carbohidratos":34,"grasas":20}'::jsonb,
    false, true, '{vegetariano,sin-gluten,sin-lactosa}', '{}', 'economico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('papa', 4, 'unidad', '4 unidades medianas', false),
  ('huevo', 5, 'unidad', '5 unidades', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('aceite', 150, 'ml', 'para freír', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Fideos con atún al pomodoro', 'Tallarines con salsa de tomate casera y atún en lata: rápido, barato y con proteína.',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cuece los fideos en agua con sal según el paquete."},{"numero":2,"descripcion":"Sofríe ajo y cebolla, agrega el tomate rallado o en tarro y reduce 10 minutos.","timerSegundos":600},{"numero":3,"descripcion":"Incorpora el atún escurrido, mezcla con los fideos y sirve con orégano."}]'::jsonb,
    '{olla,sarten}', 25, 'facil', 2, 540, '{"proteinas":30,"carbohidratos":78,"grasas":10}'::jsonb,
    false, true, '{sin-lactosa}', '{}', 'economico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('fideos', 250, 'g', 'medio paquete', false),
  ('atún', 1, 'lata', '1 lata escurrida', false),
  ('tomate', 3, 'unidad', '3 unidades o 1 tarro', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('ajo', 2, 'unidad', '2 dientes', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Garbanzos guisados', 'Garbanzos en salsa de pimentón y tomate con un toque ahumado: rinde y llena.',
    'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla, ajo y pimentón en cubitos hasta ablandar."},{"numero":2,"descripcion":"Agrega tomate rallado, comino y ají de color; reduce 5 minutos.","timerSegundos":300},{"numero":3,"descripcion":"Suma los garbanzos cocidos con un poco de su caldo y guisa 15 minutos."}]'::jsonb,
    '{olla}', 35, 'facil', 3, 390, '{"proteinas":18,"carbohidratos":58,"grasas":9}'::jsonb,
    false, true, '{vegetariano,vegano,sin-gluten,sin-lactosa}', '{}', 'economico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('garbanzos', 400, 'g', '2 tazas cocidos', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('pimentón', 1, 'unidad', '1 unidad', false),
  ('tomate', 2, 'unidad', '2 unidades', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('comino', 1, 'cucharadita', '1 cucharadita', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Panqueques salados de jamón y queso', 'Panqueques delgados rellenos y gratinados: cena de estudiante con cara de restaurante.',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Licúa o bate harina, huevos, leche y una pizca de sal hasta lograr un batido liso."},{"numero":2,"descripcion":"Haz panqueques delgados en sartén caliente con poco aceite."},{"numero":3,"descripcion":"Rellena con jamón y queso, enrolla y calienta hasta fundir."}]'::jsonb,
    '{sarten,licuadora}', 30, 'facil', 3, 460, '{"proteinas":24,"carbohidratos":42,"grasas":22}'::jsonb,
    false, true, '{}', '{}', 'economico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('harina', 200, 'g', '1 taza y media', false),
  ('huevo', 2, 'unidad', '2 unidades', false),
  ('leche', 400, 'ml', '1 taza y media', false),
  ('jamón', 150, 'g', '6 láminas', false),
  ('queso', 150, 'g', '6 láminas', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Budín de fideos con queso', 'Fideos al horno con mezcla de huevo, leche y queso dorado: rescata sobras con dignidad.',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cuece los fideos al dente y escúrrelos."},{"numero":2,"descripcion":"Mezcla con huevos batidos, leche, queso rallado, sal y pimienta."},{"numero":3,"descripcion":"Vierte en fuente aceitada y hornea a 190°C por 25 minutos hasta dorar.","timerSegundos":1500}]'::jsonb,
    '{olla,horno}', 35, 'facil', 4, 490, '{"proteinas":22,"carbohidratos":60,"grasas":18}'::jsonb,
    false, true, '{vegetariano}', '{}', 'economico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('fideos', 300, 'g', 'medio paquete largo', false),
  ('huevo', 3, 'unidad', '3 unidades', false),
  ('leche', 250, 'ml', '1 taza', false),
  ('queso', 150, 'g', '1 taza rallado', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

-- ─── ITALIANAS (6) ───────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Spaghetti al pomodoro', 'Pasta con salsa de tomate fresco, ajo y albahaca: la prueba de que menos es más.',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe ajo laminado en aceite de oliva sin quemarlo."},{"numero":2,"descripcion":"Agrega tomate rallado y cocina 15 minutos con sal y una pizca de azúcar.","timerSegundos":900},{"numero":3,"descripcion":"Cuece los fideos al dente, mézclalos en la salsa con albahaca y termina con parmesano."}]'::jsonb,
    '{olla,sarten}', 25, 'facil', 2, 480, '{"proteinas":15,"carbohidratos":82,"grasas":12}'::jsonb,
    false, true, '{vegetariano,sin-lactosa}', '{}', 'italiano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('fideos', 250, 'g', 'medio paquete', false),
  ('tomate', 4, 'unidad', '4 maduros o 1 tarro', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('albahaca', 1, 'unidad', '6 hojas', false),
  ('aceite de oliva', 30, 'ml', '2 cucharadas', false),
  ('queso parmesano', 20, 'g', 'para servir', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Risotto de champiñones', 'Arroz cremoso removido con paciencia, champiñones dorados y parmesano.',
    'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Dora los champiñones laminados en mantequilla y reserva."},{"numero":2,"descripcion":"Sofríe cebolla picada fina, agrega el arroz y nacara 2 minutos."},{"numero":3,"descripcion":"Agrega caldo caliente de a poco, revolviendo hasta que el arroz esté cremoso, unos 18 minutos.","timerSegundos":1080},{"numero":4,"descripcion":"Termina fuera del fuego con mantequilla, parmesano y los champiñones."}]'::jsonb,
    '{olla,sarten}', 45, 'media', 3, 520, '{"proteinas":14,"carbohidratos":74,"grasas":18}'::jsonb,
    false, false, '{vegetariano,sin-gluten}', '{otoño,invierno}', 'italiano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('arroz', 300, 'g', '1 taza y media', false),
  ('champiñón', 250, 'g', '2 tazas laminados', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('mantequilla', 60, 'g', '3 cucharadas', false),
  ('queso parmesano', 60, 'g', 'media taza rallado', false),
  ('caldo de verduras', 1, 'litro', '4 tazas calientes', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Lasaña de carne', 'Capas de pasta, boloñesa y bechamel gratinadas: el domingo hecho fuente.',
    'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Prepara la boloñesa: sofríe cebolla y ajo, dora la carne y reduce con tomate 20 minutos.","timerSegundos":1200},{"numero":2,"descripcion":"Haz una bechamel con mantequilla, harina y leche."},{"numero":3,"descripcion":"Arma capas de lámina, boloñesa y bechamel; cubre con queso."},{"numero":4,"descripcion":"Hornea a 190°C por 35 minutos hasta gratinar.","timerSegundos":2100}]'::jsonb,
    '{olla,sarten,horno}', 80, 'dificil', 6, 610, '{"proteinas":34,"carbohidratos":48,"grasas":30}'::jsonb,
    false, false, '{}', '{invierno}', 'italiano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('láminas de lasaña', 12, 'unidad', '1 caja', false),
  ('carne molida', 500, 'g', '2 tazas y media', false),
  ('tomate', 4, 'unidad', '4 unidades o 2 tarros', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('leche', 500, 'ml', '2 tazas', false),
  ('harina', 40, 'g', '3 cucharadas', false),
  ('mantequilla', 40, 'g', '2 cucharadas', false),
  ('queso', 200, 'g', '2 tazas rallado', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Pizza margarita casera', 'Masa casera, salsa de tomate, mozzarella fundida y albahaca fresca.',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Mezcla harina, levadura, agua tibia, sal y aceite; amasa y deja leudar 1 hora.","timerSegundos":3600},{"numero":2,"descripcion":"Estira la masa, cubre con salsa de tomate y mozzarella."},{"numero":3,"descripcion":"Hornea a máxima temperatura 12 minutos y termina con albahaca fresca.","timerSegundos":720}]'::jsonb,
    '{horno}', 90, 'media', 4, 560, '{"proteinas":24,"carbohidratos":70,"grasas":20}'::jsonb,
    false, true, '{vegetariano}', '{}', 'italiano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('harina', 400, 'g', '3 tazas', false),
  ('levadura', 7, 'g', '1 sobre', false),
  ('tomate', 3, 'unidad', '3 unidades o 1 tarro', false),
  ('queso mozzarella', 250, 'g', '2 tazas', false),
  ('albahaca', 1, 'unidad', '8 hojas', false),
  ('aceite de oliva', 30, 'ml', '2 cucharadas', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Fettuccine Alfredo con pollo', 'Cintas de pasta en salsa cremosa de mantequilla y parmesano con pollo dorado.',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Dora el pollo en cubos con sal y pimienta; reserva."},{"numero":2,"descripcion":"En la misma sartén funde mantequilla con ajo, agrega crema y parmesano."},{"numero":3,"descripcion":"Cuece los fideos al dente y mézclalos en la salsa con el pollo y agua de cocción."}]'::jsonb,
    '{olla,sarten}', 30, 'facil', 3, 680, '{"proteinas":38,"carbohidratos":64,"grasas":32}'::jsonb,
    false, false, '{}', '{}', 'italiano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('fideos', 300, 'g', 'medio paquete', false),
  ('pollo', 300, 'g', '1 pechuga grande', false),
  ('crema', 200, 'ml', '1 caja chica', false),
  ('mantequilla', 40, 'g', '2 cucharadas', false),
  ('queso parmesano', 60, 'g', 'media taza rallado', false),
  ('ajo', 2, 'unidad', '2 dientes', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Ñoquis de papa con mantequilla y salvia', 'Ñoquis caseros suaves salteados en mantequilla aromática.',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cuece las papas con piel, pélalas y hazlas puré."},{"numero":2,"descripcion":"Mezcla con harina, huevo y sal; forma rollos y corta los ñoquis."},{"numero":3,"descripcion":"Hiérvelos hasta que floten y saltéalos en mantequilla con salvia y parmesano."}]'::jsonb,
    '{olla,sarten}', 60, 'media', 4, 470, '{"proteinas":12,"carbohidratos":72,"grasas":15}'::jsonb,
    false, true, '{vegetariano}', '{}', 'italiano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('papa', 5, 'unidad', '1 kg aprox', false),
  ('harina', 250, 'g', '2 tazas', false),
  ('huevo', 1, 'unidad', '1 unidad', false),
  ('mantequilla', 80, 'g', '4 cucharadas', false),
  ('queso parmesano', 40, 'g', 'para servir', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

-- ─── ASIÁTICAS (6) ───────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Bibimbap', 'Bowl coreano de arroz con verduras salteadas, carne, huevo y toque de pasta de ají.',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cocina el arroz y saltea por separado zanahoria, espinaca y champiñón con sésamo."},{"numero":2,"descripcion":"Saltea la carne molida con salsa de soya, ajo y un toque de azúcar."},{"numero":3,"descripcion":"Monta el bowl: arroz, verduras en secciones, carne y huevo frito al centro; corona con pasta de ají."}]'::jsonb,
    '{olla,sarten}', 40, 'media', 2, 560, '{"proteinas":30,"carbohidratos":68,"grasas":18}'::jsonb,
    true, false, '{sin-lactosa}', '{}', 'asiatico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('arroz', 200, 'g', '1 taza', false),
  ('carne molida', 250, 'g', '1 taza', false),
  ('huevo', 2, 'unidad', '1 por bowl', false),
  ('zanahoria', 1, 'unidad', '1 unidad en juliana', false),
  ('espinaca', 100, 'g', '2 puñados', false),
  ('champiñón', 100, 'g', '1 taza', false),
  ('salsa de soya', 30, 'ml', '2 cucharadas', false),
  ('aceite de sésamo', 10, 'ml', '2 cucharaditas', false),
  ('pasta de ají', 15, 'g', '1 cucharada', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Ramen casero de pollo', 'Caldo profundo con fideos, pollo, huevo marinado y cebollín: abrazo japonés.',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cuece el pollo con jengibre, ajo y cebollín para hacer el caldo, 30 minutos.","timerSegundos":1800},{"numero":2,"descripcion":"Cuece huevos 6 minutos y medio, pélalos y marínalos en salsa de soya.","timerSegundos":390},{"numero":3,"descripcion":"Cuece los fideos, arma el bowl con caldo, pollo deshilachado, huevo y cebollín."}]'::jsonb,
    '{olla}', 50, 'media', 2, 520, '{"proteinas":38,"carbohidratos":58,"grasas":14}'::jsonb,
    false, false, '{sin-lactosa}', '{invierno}', 'asiatico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('fideos', 200, 'g', '2 porciones', false),
  ('pollo', 300, 'g', '1 pechuga o 2 trutros', false),
  ('huevo', 2, 'unidad', '2 unidades', false),
  ('cebollín', 2, 'unidad', '2 tallos', false),
  ('jengibre', 20, 'g', '1 trozo de 2 cm', false),
  ('ajo', 3, 'unidad', '3 dientes', false),
  ('salsa de soya', 60, 'ml', '4 cucharadas', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Curry de pollo con arroz', 'Pollo en salsa cremosa de curry y leche de coco sobre arroz graneado.',
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla, ajo y jengibre; agrega el curry y tuesta 1 minuto."},{"numero":2,"descripcion":"Dora el pollo en cubos, cubre con leche de coco y cocina 20 minutos.","timerSegundos":1200},{"numero":3,"descripcion":"Sirve sobre arroz graneado con cilantro fresco."}]'::jsonb,
    '{olla,sarten}', 40, 'facil', 3, 590, '{"proteinas":36,"carbohidratos":56,"grasas":24}'::jsonb,
    false, false, '{sin-gluten,sin-lactosa}', '{}', 'asiatico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('pollo', 400, 'g', '2 pechugas', false),
  ('arroz', 200, 'g', '1 taza', false),
  ('leche de coco', 400, 'ml', '1 lata', false),
  ('curry', 15, 'g', '1 cucharada', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('jengibre', 15, 'g', '1 trozo de 2 cm', false),
  ('cilantro', 1, 'unidad', '1 ramita', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Arroz frito con pollo', 'Arroz salteado al wok con pollo, huevo, verduras y salsa de soya: mejor que delivery.',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Saltea el pollo en cubos a fuego alto y reserva."},{"numero":2,"descripcion":"Revuelve huevo en la sartén, agrega arroz frío y suelta los granos."},{"numero":3,"descripcion":"Incorpora zanahoria, cebollín, el pollo y salsa de soya; saltea 3 minutos a fuego máximo.","timerSegundos":180}]'::jsonb,
    '{sarten,olla}', 25, 'facil', 2, 540, '{"proteinas":32,"carbohidratos":66,"grasas":16}'::jsonb,
    false, true, '{sin-lactosa}', '{}', 'asiatico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('arroz', 200, 'g', '2 tazas cocidas frías', false),
  ('pollo', 250, 'g', '1 pechuga', false),
  ('huevo', 2, 'unidad', '2 unidades', false),
  ('zanahoria', 1, 'unidad', '1 unidad en cubitos', false),
  ('cebollín', 2, 'unidad', '2 tallos', false),
  ('salsa de soya', 30, 'ml', '2 cucharadas', false),
  ('jengibre', 10, 'g', '1 cucharadita rallado', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Pad thai de pollo', 'Fideos de arroz salteados con pollo, huevo, maní y limón: agridulce tailandés.',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Remoja los fideos de arroz en agua caliente hasta ablandar."},{"numero":2,"descripcion":"Saltea el pollo, corre a un lado y revuelve el huevo en la misma sartén."},{"numero":3,"descripcion":"Agrega fideos y salsa (soya, azúcar, limón); saltea y termina con maní picado y cebollín."}]'::jsonb,
    '{sarten,hervidor}', 35, 'media', 2, 580, '{"proteinas":30,"carbohidratos":70,"grasas":20}'::jsonb,
    false, false, '{sin-lactosa}', '{}', 'asiatico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('fideos de arroz', 200, 'g', '2 porciones', false),
  ('pollo', 250, 'g', '1 pechuga', false),
  ('huevo', 2, 'unidad', '2 unidades', false),
  ('maní', 40, 'g', '1 puñado picado', false),
  ('limón', 1, 'unidad', '1 unidad', false),
  ('salsa de soya', 30, 'ml', '2 cucharadas', false),
  ('azúcar', 15, 'g', '1 cucharada', false),
  ('cebollín', 1, 'unidad', '1 tallo', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Pollo teriyaki', 'Pollo glaseado en salsa brillante de soya, jengibre y azúcar sobre arroz.',
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Mezcla salsa de soya, azúcar, ajo y jengibre rallado."},{"numero":2,"descripcion":"Dora el pollo en trozos por todos lados."},{"numero":3,"descripcion":"Vierte la salsa y reduce hasta glasear, 5 minutos; sirve sobre arroz con sésamo.","timerSegundos":300}]'::jsonb,
    '{sarten,olla}', 30, 'facil', 2, 550, '{"proteinas":40,"carbohidratos":58,"grasas":14}'::jsonb,
    true, false, '{sin-lactosa}', '{}', 'asiatico')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('pollo', 400, 'g', '2 pechugas o trutros', false),
  ('arroz', 200, 'g', '1 taza', false),
  ('salsa de soya', 60, 'ml', '4 cucharadas', false),
  ('azúcar', 30, 'g', '2 cucharadas', false),
  ('jengibre', 15, 'g', '1 trozo de 2 cm', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('sésamo', 10, 'g', '1 cucharada', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

-- ─── MEXICANAS (6) ───────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Tacos de carne', 'Tortillas calientes con carne sazonada, pico de gallo y limón.',
    'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Saltea la carne molida con cebolla, ajo, comino y ají de color."},{"numero":2,"descripcion":"Prepara pico de gallo: tomate, cebolla y cilantro picados con limón y sal."},{"numero":3,"descripcion":"Calienta las tortillas en sartén seca y arma los tacos."}]'::jsonb,
    '{sarten}', 30, 'facil', 3, 520, '{"proteinas":30,"carbohidratos":48,"grasas":22}'::jsonb,
    false, true, '{sin-lactosa}', '{}', 'mexicano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('tortillas', 9, 'unidad', '3 por persona', false),
  ('carne molida', 400, 'g', '2 tazas', false),
  ('tomate', 2, 'unidad', '2 unidades', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('cilantro', 1, 'unidad', '1 puñado', false),
  ('limón', 2, 'unidad', '2 unidades', false),
  ('ají', 1, 'unidad', '1 unidad', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Fajitas de pollo', 'Tiras de pollo y pimentón salteadas con especias, servidas en tortillas con palta.',
    'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Adoba el pollo en tiras con comino, ají de color, sal y limón."},{"numero":2,"descripcion":"Saltea a fuego alto el pollo con pimentón y cebolla en tiras hasta dorar."},{"numero":3,"descripcion":"Sirve en tortillas calientes con palta laminada."}]'::jsonb,
    '{sarten}', 30, 'facil', 3, 540, '{"proteinas":36,"carbohidratos":50,"grasas":20}'::jsonb,
    true, false, '{sin-lactosa}', '{}', 'mexicano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('tortillas', 6, 'unidad', '2 por persona', false),
  ('pollo', 400, 'g', '2 pechugas en tiras', false),
  ('pimentón', 2, 'unidad', '2 de colores distintos', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('limón', 1, 'unidad', '1 unidad', false),
  ('comino', 1, 'cucharadita', '1 cucharadita', false),
  ('palta', 1, 'unidad', '1 unidad', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Quesadillas de queso y champiñón', 'Tortillas doradas con queso fundido y champiñones salteados.',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Saltea los champiñones con cebolla hasta dorar."},{"numero":2,"descripcion":"Rellena las tortillas con queso y el salteado; dóblalas."},{"numero":3,"descripcion":"Dora en sartén seca 2 minutos por lado hasta fundir el queso.","timerSegundos":240}]'::jsonb,
    '{sarten}', 20, 'facil', 2, 460, '{"proteinas":20,"carbohidratos":44,"grasas":24}'::jsonb,
    false, true, '{vegetariano}', '{}', 'mexicano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('tortillas', 4, 'unidad', '4 unidades', false),
  ('queso', 200, 'g', '2 tazas rallado', false),
  ('champiñón', 200, 'g', '2 tazas laminados', false),
  ('cebolla', 1, 'unidad', 'media unidad', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Guacamole con totopos', 'Palta machacada con tomate, cebolla, cilantro y limón: el dip que no falla.',
    'https://images.unsplash.com/photo-1541544181051-e46607bc22a4?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Machaca las paltas con jugo de limón y sal."},{"numero":2,"descripcion":"Mezcla con tomate, cebolla y cilantro picados finos."},{"numero":3,"descripcion":"Sirve inmediatamente con totopos; agrega ají si quieres chispa."}]'::jsonb,
    '{}', 15, 'facil', 4, 320, '{"proteinas":5,"carbohidratos":28,"grasas":22}'::jsonb,
    false, true, '{vegetariano,vegano,sin-gluten,sin-lactosa}', '{verano}', 'mexicano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('palta', 3, 'unidad', '3 maduras', false),
  ('tomate', 1, 'unidad', '1 unidad', false),
  ('cebolla', 1, 'unidad', 'media unidad', false),
  ('cilantro', 1, 'unidad', '1 puñado', false),
  ('limón', 2, 'unidad', '2 unidades', false),
  ('totopos', 200, 'g', '1 bolsa', false),
  ('ají', 1, 'unidad', '1 unidad', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Burritos de porotos negros', 'Tortillas rellenas de porotos negros guisados, arroz y queso: contundente y barato.',
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Guisa los porotos negros con cebolla, ajo, comino y un poco de su caldo."},{"numero":2,"descripcion":"Arma cada tortilla con arroz, porotos, queso y tomate picado."},{"numero":3,"descripcion":"Enrolla cerrando los extremos y dora el burrito en sartén por ambos lados."}]'::jsonb,
    '{sarten,olla}', 35, 'facil', 3, 560, '{"proteinas":22,"carbohidratos":80,"grasas":16}'::jsonb,
    false, true, '{vegetariano}', '{}', 'mexicano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('tortillas', 3, 'unidad', '3 grandes', false),
  ('porotos negros', 400, 'g', '2 tazas cocidos', false),
  ('arroz', 150, 'g', '1 taza cocida', false),
  ('queso', 100, 'g', '1 taza rallado', false),
  ('tomate', 1, 'unidad', '1 unidad', false),
  ('cebolla', 1, 'unidad', 'media unidad', false),
  ('comino', 1, 'cucharadita', '1 cucharadita', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Chilaquiles con huevo', 'Totopos bañados en salsa de tomate y ají, con huevo frito, queso y crema.',
    'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Licúa tomate, ají, cebolla y ajo; cocina la salsa 10 minutos.","timerSegundos":600},{"numero":2,"descripcion":"Baña los totopos en la salsa caliente sin que se ablanden del todo."},{"numero":3,"descripcion":"Sirve de inmediato con huevo frito, queso desmenuzado y crema."}]'::jsonb,
    '{sarten,licuadora}', 25, 'media', 2, 490, '{"proteinas":18,"carbohidratos":46,"grasas":26}'::jsonb,
    false, true, '{vegetariano}', '{}', 'mexicano')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('totopos', 200, 'g', '1 bolsa', false),
  ('tomate', 4, 'unidad', '4 maduros', false),
  ('ají', 1, 'unidad', '1 unidad', false),
  ('huevo', 2, 'unidad', '1 por persona', false),
  ('queso', 80, 'g', 'para desmenuzar', false),
  ('crema', 60, 'ml', '3 cucharadas', true),
  ('cebolla', 1, 'unidad', 'media unidad', false),
  ('ajo', 1, 'unidad', '1 diente', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

-- ─── FITNESS (6) ─────────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Bowl de pollo y quinoa', 'Bowl alto en proteína con quinoa, pollo grillado, palta y espinaca fresca.',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Lava y cuece la quinoa 15 minutos en el doble de agua.","timerSegundos":900},{"numero":2,"descripcion":"Grilla la pechuga sazonada con sal, pimienta y limón; córtala en láminas."},{"numero":3,"descripcion":"Arma el bowl con quinoa, espinaca, tomate, pollo y palta; aliña con limón y aceite de oliva."}]'::jsonb,
    '{olla,sarten}', 30, 'facil', 2, 480, '{"proteinas":42,"carbohidratos":38,"grasas":18}'::jsonb,
    true, false, '{sin-gluten,sin-lactosa}', '{}', 'fitness')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('pollo', 300, 'g', '2 pechugas chicas', false),
  ('quinoa', 150, 'g', 'tres cuartos de taza', false),
  ('palta', 1, 'unidad', '1 unidad', false),
  ('espinaca', 60, 'g', '2 puñados', false),
  ('tomate', 1, 'unidad', '1 unidad', false),
  ('limón', 1, 'unidad', '1 unidad', false),
  ('aceite de oliva', 15, 'ml', '1 cucharada', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Salmón al horno con verduras', 'Filete de salmón con brócoli y zanahoria asados: omega 3 sin esfuerzo.',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Precalienta el horno a 200°C y distribuye brócoli y zanahoria con aceite de oliva y sal en una bandeja."},{"numero":2,"descripcion":"Hornea las verduras 10 minutos, suma el salmón con limón y ajo.","timerSegundos":600},{"numero":3,"descripcion":"Hornea 15 minutos más hasta que el salmón esté cocido pero jugoso.","timerSegundos":900}]'::jsonb,
    '{horno}', 30, 'facil', 2, 520, '{"proteinas":40,"carbohidratos":18,"grasas":30}'::jsonb,
    true, false, '{sin-gluten,sin-lactosa}', '{}', 'fitness')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('salmón', 400, 'g', '2 filetes', false),
  ('brócoli', 300, 'g', '1 unidad chica', false),
  ('zanahoria', 2, 'unidad', '2 unidades', false),
  ('limón', 1, 'unidad', '1 unidad', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('aceite de oliva', 30, 'ml', '2 cucharadas', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Omelette de espinaca y champiñón', 'Omelette esponjoso relleno de espinaca y champiñón: desayuno o cena en 15 minutos.',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Saltea champiñones y espinaca hasta evaporar el líquido."},{"numero":2,"descripcion":"Bate los huevos con sal y viértelos en sartén antiadherente a fuego medio."},{"numero":3,"descripcion":"Cuando cuaje el borde, agrega el relleno y queso; dobla y sirve."}]'::jsonb,
    '{sarten}', 15, 'facil', 1, 280, '{"proteinas":24,"carbohidratos":6,"grasas":18}'::jsonb,
    true, true, '{vegetariano,sin-gluten}', '{}', 'fitness')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('huevo', 3, 'unidad', '3 unidades', false),
  ('espinaca', 50, 'g', '1 puñado', false),
  ('champiñón', 80, 'g', '5 unidades', false),
  ('queso', 30, 'g', '1 lámina', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Ensalada de atún y garbanzos', 'Ensalada proteica sin cocción: atún, garbanzos, tomate y cebolla morada al limón.',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Escurre garbanzos y atún; pica tomate y cebolla en cubos finos."},{"numero":2,"descripcion":"Mezcla todo en un bowl con aceite de oliva, jugo de limón, sal y pimienta."},{"numero":3,"descripcion":"Deja reposar 5 minutos para que los sabores se integren.","timerSegundos":300}]'::jsonb,
    '{}', 15, 'facil', 2, 390, '{"proteinas":32,"carbohidratos":36,"grasas":14}'::jsonb,
    true, true, '{sin-gluten,sin-lactosa}', '{verano}', 'fitness')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('atún', 2, 'lata', '2 latas escurridas', false),
  ('garbanzos', 400, 'g', '2 tazas cocidos', false),
  ('tomate', 2, 'unidad', '2 unidades', false),
  ('cebolla', 1, 'unidad', 'media morada', false),
  ('limón', 1, 'unidad', '1 unidad', false),
  ('aceite de oliva', 30, 'ml', '2 cucharadas', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Pechuga grillada con puré de coliflor', 'Pollo jugoso sobre puré cremoso de coliflor: bajo en carbohidratos, alto en sabor.',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cuece la coliflor en trozos hasta que esté muy blanda."},{"numero":2,"descripcion":"Muele con leche caliente, ajo dorado, sal y un chorro de aceite de oliva."},{"numero":3,"descripcion":"Grilla la pechuga sazonada 5 minutos por lado y sirve sobre el puré.","timerSegundos":600}]'::jsonb,
    '{olla,sarten,licuadora}', 35, 'facil', 2, 410, '{"proteinas":44,"carbohidratos":16,"grasas":18}'::jsonb,
    true, false, '{sin-gluten}', '{}', 'fitness')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('pollo', 400, 'g', '2 pechugas', false),
  ('coliflor', 1, 'unidad', '1 unidad chica', false),
  ('leche', 100, 'ml', 'media taza', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('aceite de oliva', 15, 'ml', '1 cucharada', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Wraps de lechuga con carne salteada', 'Hojas de lechuga como tortilla: relleno asiático de carne, zanahoria y jengibre.',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Saltea la carne molida con ajo, jengibre y salsa de soya a fuego alto."},{"numero":2,"descripcion":"Agrega zanahoria rallada y cebollín; saltea 2 minutos más.","timerSegundos":120},{"numero":3,"descripcion":"Sirve el relleno caliente en hojas de lechuga grandes y firmes."}]'::jsonb,
    '{sarten}', 25, 'facil', 2, 320, '{"proteinas":30,"carbohidratos":14,"grasas":16}'::jsonb,
    true, false, '{sin-lactosa}', '{}', 'fitness')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('carne molida', 300, 'g', '1 taza y media', false),
  ('lechuga', 1, 'unidad', '8 hojas grandes', false),
  ('zanahoria', 1, 'unidad', '1 unidad rallada', false),
  ('cebollín', 1, 'unidad', '1 tallo', false),
  ('jengibre', 10, 'g', '1 cucharadita rallado', false),
  ('salsa de soya', 30, 'ml', '2 cucharadas', false),
  ('ajo', 2, 'unidad', '2 dientes', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

-- ─── DULCES (6) ──────────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Panqueques de avena y plátano', 'Panqueques sin harina refinada: avena, plátano y huevo, dorados con canela.',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Licúa avena, plátano maduro, huevos, leche y canela hasta lograr un batido espeso."},{"numero":2,"descripcion":"Cocina porciones en sartén antiadherente a fuego medio, 2 minutos por lado.","timerSegundos":240},{"numero":3,"descripcion":"Sirve con miel y fruta fresca."}]'::jsonb,
    '{sarten,licuadora}', 20, 'facil', 2, 380, '{"proteinas":16,"carbohidratos":58,"grasas":10}'::jsonb,
    true, true, '{vegetariano,sin-gluten}', '{}', 'dulce')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('avena', 100, 'g', '1 taza', false),
  ('plátano', 2, 'unidad', '2 maduros', false),
  ('huevo', 2, 'unidad', '2 unidades', false),
  ('leche', 100, 'ml', 'media taza', false),
  ('canela', 1, 'cucharadita', '1 cucharadita', false),
  ('miel', 30, 'g', '2 cucharadas', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Mousse de chocolate y palta', 'Mousse cremoso donde la palta hace de base sedosa y el cacao manda: nadie adivina el secreto.',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Licúa paltas maduras con cacao, miel y leche hasta que quede sedoso."},{"numero":2,"descripcion":"Prueba y ajusta el dulzor; agrega más leche si está muy espeso."},{"numero":3,"descripcion":"Refrigera 30 minutos antes de servir con fruta o nueces.","timerSegundos":1800}]'::jsonb,
    '{licuadora}', 15, 'facil', 4, 260, '{"proteinas":5,"carbohidratos":24,"grasas":16}'::jsonb,
    true, true, '{vegetariano,sin-gluten}', '{}', 'dulce')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('palta', 2, 'unidad', '2 maduras', false),
  ('cacao', 40, 'g', '4 cucharadas', false),
  ('miel', 60, 'g', '4 cucharadas', false),
  ('leche', 60, 'ml', '4 cucharadas', false),
  ('nueces', 30, 'g', 'para decorar', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Arroz con leche', 'El postre de la abuela: arroz cremoso con leche, canela y cáscara de limón.',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Cuece el arroz en agua con cáscara de limón hasta ablandar."},{"numero":2,"descripcion":"Agrega la leche y el azúcar; cocina a fuego suave revolviendo 20 minutos.","timerSegundos":1200},{"numero":3,"descripcion":"Sirve tibio o frío espolvoreado con canela."}]'::jsonb,
    '{olla}', 45, 'facil', 4, 340, '{"proteinas":8,"carbohidratos":64,"grasas":6}'::jsonb,
    false, true, '{vegetariano,sin-gluten}', '{}', 'dulce')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('arroz', 150, 'g', 'tres cuartos de taza', false),
  ('leche', 1, 'litro', '4 tazas', false),
  ('azúcar', 100, 'g', 'media taza', false),
  ('canela', 1, 'cucharadita', 'en polvo o rama', false),
  ('limón', 1, 'unidad', 'solo la cáscara', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Brownies de porotos negros', 'Brownies húmedos y sin harina: los porotos negros aportan cuerpo y proteína.',
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Licúa porotos negros cocidos y enjuagados con huevos, cacao, azúcar y aceite."},{"numero":2,"descripcion":"Vierte en molde aceitado y agrega nueces si quieres."},{"numero":3,"descripcion":"Hornea a 180°C por 25 minutos; deja enfriar antes de cortar.","timerSegundos":1500}]'::jsonb,
    '{horno,licuadora}', 45, 'media', 8, 210, '{"proteinas":7,"carbohidratos":28,"grasas":9}'::jsonb,
    true, true, '{vegetariano,sin-gluten,sin-lactosa}', '{}', 'dulce')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('porotos negros', 400, 'g', '2 tazas cocidos', false),
  ('huevo', 3, 'unidad', '3 unidades', false),
  ('cacao', 50, 'g', '5 cucharadas', false),
  ('azúcar', 120, 'g', 'media taza y algo más', false),
  ('aceite', 60, 'ml', '4 cucharadas', false),
  ('nueces', 50, 'g', '1 puñado', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Yogur con granola casera', 'Granola tostada en sartén con avena, miel y nueces sobre yogur cremoso y plátano.',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Tuesta la avena con nueces picadas y una pizca de canela en sartén seca."},{"numero":2,"descripcion":"Agrega miel, mezcla rápido y deja enfriar sobre un plato para que quede crocante."},{"numero":3,"descripcion":"Sirve sobre yogur con plátano en rodajas."}]'::jsonb,
    '{sarten}', 15, 'facil', 2, 350, '{"proteinas":14,"carbohidratos":48,"grasas":12}'::jsonb,
    true, true, '{vegetariano,sin-gluten}', '{}', 'dulce')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('yogur', 300, 'g', '2 potes', false),
  ('avena', 80, 'g', 'tres cuartos de taza', false),
  ('miel', 40, 'g', '2 cucharadas', false),
  ('nueces', 40, 'g', '1 puñado', false),
  ('plátano', 1, 'unidad', '1 unidad', false),
  ('canela', 1, 'cucharadita', '1 pizca', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Queque de zanahoria', 'Queque húmedo de zanahoria con canela y nueces: dulzor que pasa por saludable.',
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Bate huevos con azúcar y aceite; incorpora la zanahoria rallada fina."},{"numero":2,"descripcion":"Agrega harina, polvos de hornear, canela y nueces; mezcla justo hasta integrar."},{"numero":3,"descripcion":"Hornea en molde a 180°C por 40 minutos o hasta que el palito salga limpio.","timerSegundos":2400}]'::jsonb,
    '{horno}', 60, 'media', 8, 320, '{"proteinas":6,"carbohidratos":42,"grasas":15}'::jsonb,
    false, true, '{vegetariano,sin-lactosa}', '{}', 'dulce')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('zanahoria', 3, 'unidad', '2 tazas ralladas', false),
  ('harina', 250, 'g', '2 tazas', false),
  ('huevo', 3, 'unidad', '3 unidades', false),
  ('azúcar', 150, 'g', 'tres cuartos de taza', false),
  ('aceite', 120, 'ml', 'media taza', false),
  ('canela', 1, 'cucharadita', '1 cucharadita', false),
  ('nueces', 50, 'g', '1 puñado', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

-- ─── PICANTES (6) ────────────────────────────────────────────────────────────

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Pollo al ají con arroz', 'Trozos de pollo guisados en salsa criolla de ají, tomate y cebolla sobre arroz.',
    'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla, ajo y ají picado sin semillas (o con ellas si te atreves)."},{"numero":2,"descripcion":"Dora el pollo en trozos, agrega tomate rallado y cocina tapado 20 minutos.","timerSegundos":1200},{"numero":3,"descripcion":"Sirve sobre arroz graneado con cilantro."}]'::jsonb,
    '{olla,sarten}', 40, 'media', 3, 560, '{"proteinas":38,"carbohidratos":58,"grasas":16}'::jsonb,
    false, false, '{sin-gluten,sin-lactosa}', '{}', 'picante')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('pollo', 500, 'g', '4 trutros o 2 pechugas', false),
  ('ají', 2, 'unidad', '2 unidades', false),
  ('arroz', 200, 'g', '1 taza', false),
  ('tomate', 2, 'unidad', '2 unidades', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('ajo', 3, 'unidad', '3 dientes', false),
  ('cilantro', 1, 'unidad', '1 ramita', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Camarones al pil pil', 'Camarones en aceite de oliva burbujeante con ajo y ají: para mojar pan sin culpa.',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Calienta abundante aceite de oliva con ajo laminado y ají en rodajas."},{"numero":2,"descripcion":"Cuando el ajo dore, agrega los camarones con sal y pimentón."},{"numero":3,"descripcion":"Cocina 3 minutos hasta que tomen color; termina con limón y perejil.","timerSegundos":180}]'::jsonb,
    '{sarten}', 20, 'facil', 2, 380, '{"proteinas":32,"carbohidratos":6,"grasas":26}'::jsonb,
    true, false, '{sin-gluten,sin-lactosa}', '{}', 'picante')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('camarones', 400, 'g', '2 tazas pelados', false),
  ('ajo', 5, 'unidad', '5 dientes', false),
  ('ají', 1, 'unidad', '1 unidad o cayena', false),
  ('aceite de oliva', 100, 'ml', 'media taza', false),
  ('limón', 1, 'unidad', '1 unidad', false),
  ('pan', 1, 'unidad', '1 marraqueta', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Penne arrabbiata', 'Pasta en salsa de tomate brava con ajo y ají: la furia italiana en 25 minutos.',
    'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Dora ajo laminado y ají en hojuelas en aceite de oliva."},{"numero":2,"descripcion":"Agrega tomate y cocina 15 minutos hasta espesar.","timerSegundos":900},{"numero":3,"descripcion":"Mezcla con la pasta al dente y agua de cocción; sirve con perejil."}]'::jsonb,
    '{olla,sarten}', 25, 'facil', 2, 470, '{"proteinas":14,"carbohidratos":80,"grasas":11}'::jsonb,
    false, true, '{vegetariano,vegano,sin-lactosa}', '{}', 'picante')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('fideos', 250, 'g', 'medio paquete', false),
  ('tomate', 4, 'unidad', '4 unidades o 1 tarro', false),
  ('ají', 2, 'unidad', '2 unidades o 1 cucharadita en hojuelas', false),
  ('ajo', 3, 'unidad', '3 dientes', false),
  ('aceite de oliva', 30, 'ml', '2 cucharadas', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Chili con carne', 'Guiso tex-mex de carne, porotos y ají con comino: cuchara grande obligatoria.',
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla, ajo y ají; agrega la carne y dórala bien."},{"numero":2,"descripcion":"Suma tomate, comino y ají de color; cocina 20 minutos.","timerSegundos":1200},{"numero":3,"descripcion":"Incorpora los porotos cocidos y guisa 10 minutos más; sirve con arroz o totopos.","timerSegundos":600}]'::jsonb,
    '{olla}', 50, 'media', 4, 520, '{"proteinas":34,"carbohidratos":44,"grasas":22}'::jsonb,
    false, false, '{sin-gluten,sin-lactosa}', '{invierno}', 'picante')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('carne molida', 500, 'g', '2 tazas y media', false),
  ('porotos', 400, 'g', '2 tazas cocidos', false),
  ('tomate', 3, 'unidad', '3 unidades o 1 tarro', false),
  ('ají', 2, 'unidad', '2 unidades', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('ajo', 3, 'unidad', '3 dientes', false),
  ('comino', 1, 'cucharadita', '2 cucharaditas', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Alitas picantes al horno', 'Alitas glaseadas con miel, ají y soya, doradas al horno o airfryer.',
    'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Mezcla miel, salsa de soya, ají picado y ajo rallado para el glaseado."},{"numero":2,"descripcion":"Embadurna las alitas y hornea a 200°C por 20 minutos.","timerSegundos":1200},{"numero":3,"descripcion":"Voltea, pinta con más glaseado y hornea 15 minutos hasta caramelizar.","timerSegundos":900}]'::jsonb,
    '{horno,airfryer}', 45, 'facil', 3, 480, '{"proteinas":36,"carbohidratos":22,"grasas":28}'::jsonb,
    false, false, '{sin-lactosa}', '{}', 'picante')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('pollo', 800, 'g', '12 alitas', false),
  ('miel', 60, 'g', '3 cucharadas', false),
  ('salsa de soya', 45, 'ml', '3 cucharadas', false),
  ('ají', 1, 'unidad', '1 unidad picada fina', false),
  ('ajo', 2, 'unidad', '2 dientes', false)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

with r as (
  insert into public.recipes (title, description, image_url, steps, utensils_required, prep_time_minutes, difficulty, servings, calories, macros, is_fitness, is_student, restrictions, seasons, category)
  values ('Huevos a la diabla', 'Huevos pochados en salsa picante de tomate, pimentón y comino, estilo shakshuka.',
    'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=800&auto=format&fit=crop&q=60',
    '[{"numero":1,"descripcion":"Sofríe cebolla, pimentón, ajo y ají; agrega tomate y comino y reduce 10 minutos.","timerSegundos":600},{"numero":2,"descripcion":"Haz huecos en la salsa y casca un huevo en cada uno."},{"numero":3,"descripcion":"Tapa y cocina 5 minutos hasta cuajar la clara con yema líquida; sirve con pan.","timerSegundos":300}]'::jsonb,
    '{sarten}', 30, 'facil', 2, 360, '{"proteinas":20,"carbohidratos":22,"grasas":22}'::jsonb,
    true, true, '{vegetariano,sin-gluten,sin-lactosa}', '{}', 'picante')
  returning id
)
insert into public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, no_scale_equivalent, is_optional)
select r.id, i.* from r cross join (values
  ('huevo', 4, 'unidad', '2 por persona', false),
  ('tomate', 4, 'unidad', '4 maduros o 1 tarro', false),
  ('pimentón', 1, 'unidad', '1 unidad', false),
  ('ají', 1, 'unidad', '1 unidad', false),
  ('cebolla', 1, 'unidad', '1 unidad', false),
  ('ajo', 2, 'unidad', '2 dientes', false),
  ('comino', 1, 'cucharadita', '1 cucharadita', false),
  ('pan', 1, 'unidad', 'para acompañar', true)
) as i(ingredient_name, quantity, unit, no_scale_equivalent, is_optional);

commit;

-- Verificación rápida post-seed:
--   select category, count(*) from public.recipes group by category order by 1;
--   select count(*) from public.recipe_ingredients;
