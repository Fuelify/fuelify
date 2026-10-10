-- Fuelify — fixes and data needed by the full web port
--
-- 1. Households: the creator could not read back a household they just
--    inserted. The SELECT policy requires membership, but the owner row is
--    added by an AFTER INSERT trigger that runs after RETURNING is checked,
--    so `insert ... returning` (supabase-js `.insert().select()`) failed RLS.
--    (The web app no longer relies on this — it inserts without RETURNING —
--    but the policy is still the correct one.)
-- 2. A starter recipe catalog so Discover has something to show.

-- ============================================================
-- 1. HOUSEHOLDS — creators can always read their own household
-- ============================================================

DROP POLICY IF EXISTS households_select ON households;
CREATE POLICY households_select ON households
  FOR SELECT USING (created_by = auth.uid() OR is_household_member(id));

-- ============================================================
-- 2. STARTER RECIPES (created_by NULL = catalog recipe)
-- ============================================================

INSERT INTO recipes (title, description, ingredients, steps, prep_time_minutes, cook_time_minutes, servings, cuisine, diet_type, calories)
SELECT * FROM (VALUES
  ('Greek Chicken Bowls', 'Lemon-oregano chicken over herbed rice with cucumber, tomato and tzatziki.',
    '["2 chicken breasts","1 cup long-grain rice","1 lemon","2 tsp dried oregano","1 cucumber","2 tomatoes","1/2 red onion","1/2 cup tzatziki","Olive oil, salt, pepper"]'::jsonb,
    '["Marinate chicken in lemon juice, oregano, olive oil, salt and pepper for 15 minutes.","Cook rice according to package directions.","Grill or pan-sear chicken 6–7 minutes per side, then rest and slice.","Dice cucumber, tomatoes and onion.","Build bowls with rice, chicken and vegetables; top with tzatziki."]'::jsonb,
    15, 25, 4, 'Mediterranean', 'Omnivore', 520),
  ('Salmon Teriyaki with Greens', 'Glazed salmon fillets with garlicky bok choy and jasmine rice.',
    '["4 salmon fillets","1/3 cup teriyaki sauce","1 tbsp honey","2 heads bok choy","2 cloves garlic","1 cup jasmine rice","Sesame seeds","Spring onion"]'::jsonb,
    '["Cook the rice.","Whisk teriyaki sauce with honey.","Sear salmon skin-side down 4 minutes, flip, brush with glaze and cook 3 more minutes.","Stir-fry bok choy with garlic for 3 minutes.","Serve salmon over rice with greens; garnish with sesame and spring onion."]'::jsonb,
    10, 20, 4, 'Japanese', 'Pescatarian', 560),
  ('Chickpea Coconut Curry', 'A creamy, warming curry that comes together in one pot.',
    '["2 cans chickpeas","1 can coconut milk","1 can diced tomatoes","1 onion","3 cloves garlic","1 tbsp ginger","2 tbsp curry powder","2 cups spinach","Rice or naan to serve"]'::jsonb,
    '["Sauté onion until soft, then add garlic, ginger and curry powder for 1 minute.","Add tomatoes, coconut milk and chickpeas; simmer 15 minutes.","Stir in spinach until wilted.","Season and serve with rice or naan."]'::jsonb,
    10, 25, 4, 'Indian', 'Vegan', 480),
  ('Turkey Taco Lettuce Wraps', 'Light, crunchy tacos with seasoned ground turkey.',
    '["1 lb ground turkey","1 tbsp taco seasoning","1 head butter lettuce","1 cup pico de gallo","1 avocado","1/2 cup shredded cheese","1 lime"]'::jsonb,
    '["Brown turkey with taco seasoning and a splash of water.","Separate lettuce leaves into cups.","Fill with turkey, pico de gallo, avocado and cheese.","Finish with a squeeze of lime."]'::jsonb,
    10, 12, 4, 'Mexican', 'Omnivore', 380),
  ('Mediterranean Quinoa Salad', 'Bright quinoa salad with feta, olives and a lemon vinaigrette.',
    '["1 cup quinoa","1 cucumber","1 cup cherry tomatoes","1/2 cup kalamata olives","1/2 cup feta","1/4 cup parsley","1 lemon","3 tbsp olive oil"]'::jsonb,
    '["Cook quinoa and let it cool.","Chop cucumber, tomatoes, olives and parsley.","Whisk lemon juice with olive oil, salt and pepper.","Toss everything together and top with feta."]'::jsonb,
    15, 15, 4, 'Mediterranean', 'Vegetarian', 410),
  ('Overnight Oats with Berries', 'Make-ahead breakfast with oats, chia and fresh berries.',
    '["1/2 cup rolled oats","1/2 cup milk or oat milk","1/4 cup Greek yogurt","1 tbsp chia seeds","1 tsp maple syrup","1/2 cup mixed berries"]'::jsonb,
    '["Stir oats, milk, yogurt, chia and maple syrup together in a jar.","Refrigerate overnight.","Top with berries in the morning."]'::jsonb,
    5, 0, 1, 'American', 'Vegetarian', 350),
  ('Beef and Broccoli Stir-Fry', 'Takeout-style beef and broccoli in a savory garlic sauce.',
    '["1 lb flank steak","4 cups broccoli florets","3 tbsp soy sauce","1 tbsp oyster sauce","1 tbsp cornstarch","2 cloves garlic","1 tsp ginger","Rice to serve"]'::jsonb,
    '["Slice steak thinly against the grain and toss with 1 tbsp soy sauce and cornstarch.","Sear beef in batches over high heat; set aside.","Stir-fry broccoli 3 minutes with garlic and ginger.","Return beef, add remaining soy and oyster sauce, toss 1 minute.","Serve over rice."]'::jsonb,
    15, 15, 4, 'Chinese', 'Omnivore', 540),
  ('Black Bean Sweet Potato Tacos', 'Roasted sweet potato and smoky black beans in warm tortillas.',
    '["2 sweet potatoes","1 can black beans","1 tsp smoked paprika","1 tsp cumin","8 corn tortillas","1 avocado","1/4 cup cilantro","1 lime"]'::jsonb,
    '["Dice sweet potatoes, toss with oil, paprika and cumin; roast at 425°F for 25 minutes.","Warm black beans with a pinch of cumin.","Warm tortillas.","Fill with sweet potato, beans, avocado and cilantro; add lime."]'::jsonb,
    10, 25, 4, 'Mexican', 'Vegan', 430),
  ('Shrimp Scampi Zoodles', 'Garlic-butter shrimp tossed with zucchini noodles.',
    '["1 lb shrimp","4 zucchini, spiralized","4 cloves garlic","2 tbsp butter","1 lemon","1/4 tsp chili flakes","Parsley","Parmesan"]'::jsonb,
    '["Melt butter and sauté garlic with chili flakes for 1 minute.","Add shrimp and cook 2 minutes per side.","Add zucchini noodles and lemon juice; toss 2 minutes.","Finish with parsley and parmesan."]'::jsonb,
    15, 10, 4, 'Italian', 'Pescatarian', 320),
  ('Lentil Bolognese', 'Hearty plant-based bolognese over whole-wheat pasta.',
    '["1 cup brown lentils","1 onion","2 carrots","2 celery stalks","3 cloves garlic","1 can crushed tomatoes","2 tbsp tomato paste","12 oz whole-wheat spaghetti","Italian seasoning"]'::jsonb,
    '["Finely dice onion, carrot and celery; sauté 8 minutes.","Add garlic and tomato paste for 1 minute.","Add lentils, tomatoes, seasoning and 2 cups water; simmer 30 minutes.","Cook pasta and toss with the sauce."]'::jsonb,
    15, 40, 6, 'Italian', 'Vegan', 460),
  ('Egg & Veggie Breakfast Scramble', 'Protein-packed scramble with peppers, spinach and feta.',
    '["4 eggs","1 bell pepper","1 cup spinach","1/4 cup feta","1/4 onion","Whole-grain toast"]'::jsonb,
    '["Sauté onion and pepper until soft.","Add spinach until wilted.","Pour in whisked eggs and stir gently until just set.","Top with feta and serve with toast."]'::jsonb,
    5, 10, 2, 'American', 'Vegetarian', 330),
  ('Sheet-Pan Lemon Herb Chicken', 'Chicken thighs roasted with potatoes and green beans on one pan.',
    '["6 chicken thighs","1 lb baby potatoes","8 oz green beans","1 lemon","3 cloves garlic","1 tbsp rosemary","Olive oil, salt, pepper"]'::jsonb,
    '["Heat oven to 425°F.","Toss halved potatoes with oil, salt and rosemary; roast 15 minutes.","Add chicken rubbed with garlic, lemon zest and oil; roast 20 minutes.","Add green beans and lemon slices; roast 10 more minutes."]'::jsonb,
    15, 45, 4, 'American', 'Omnivore', 590),
  ('Tofu Pad Thai', 'Sweet, tangy rice noodles with crispy tofu and peanuts.',
    '["8 oz rice noodles","14 oz firm tofu","3 tbsp tamari","2 tbsp lime juice","2 tbsp brown sugar","1 cup bean sprouts","3 spring onions","1/4 cup peanuts"]'::jsonb,
    '["Soak noodles in hot water until pliable.","Press and cube tofu; pan-fry until golden.","Whisk tamari, lime juice and sugar.","Toss noodles with sauce, tofu and sprouts over high heat for 2 minutes.","Top with spring onions and crushed peanuts."]'::jsonb,
    20, 15, 4, 'Thai', 'Vegan', 510),
  ('Tuna Poke Bowl', 'Fresh sushi-grade tuna with rice, edamame and avocado.',
    '["12 oz sushi-grade tuna","2 tbsp soy sauce","1 tsp sesame oil","2 cups sushi rice","1 cup edamame","1 avocado","1 cucumber","Pickled ginger, nori"]'::jsonb,
    '["Cook and cool the rice.","Cube tuna and toss with soy sauce and sesame oil.","Slice avocado and cucumber.","Assemble bowls with rice, tuna, edamame, avocado and cucumber; garnish with ginger and nori."]'::jsonb,
    20, 20, 2, 'Japanese', 'Pescatarian', 610),
  ('Caprese Stuffed Portobellos', 'Roasted mushrooms filled with tomato, mozzarella and basil.',
    '["4 portobello caps","1 cup cherry tomatoes","4 oz fresh mozzarella","Fresh basil","2 tbsp balsamic glaze","Olive oil"]'::jsonb,
    '["Heat oven to 400°F; brush mushrooms with oil.","Fill with halved tomatoes and mozzarella.","Roast 15 minutes.","Top with basil and balsamic glaze."]'::jsonb,
    10, 15, 4, 'Italian', 'Vegetarian', 240),
  ('Rainbow Raw Veggie Wraps', 'No-cook collard wraps with hummus and crunchy vegetables.',
    '["4 large collard leaves","1/2 cup hummus","1 carrot","1 red pepper","1/2 red cabbage","1 avocado","Sprouts"]'::jsonb,
    '["Trim collard stems so leaves lie flat.","Spread hummus down the center.","Layer julienned vegetables, avocado and sprouts.","Roll tightly like a burrito and slice in half."]'::jsonb,
    15, 0, 2, 'American', 'Raw', 290)
) AS v(title, description, ingredients, steps, prep, cook, servings, cuisine, diet, calories)
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE created_by IS NULL);
