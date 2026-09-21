// Seed data for the meal bank, derived from weekly-menu-template.md and grocery-list.md.
// Sections match the grocery list categories: produce, meat_seafood, dairy_eggs, pantry_grains, canned_frozen, condiments.

function ing(name, section, quantity) {
  return { name, section, quantity: quantity || "" };
}

const SEED_MEALS = [
  // ---------------- Breakfast ----------------
  { name: "Greek yogurt with granola, honey, and berries", category: "breakfast", cuisine: "American", ingredients: [
    ing("Greek yogurt", "dairy_eggs"), ing("Granola", "pantry_grains"), ing("Honey", "pantry_grains"), ing("Mixed berries", "produce"),
  ]},
  { name: "Scrambled eggs, toast, sliced tomato", category: "breakfast", cuisine: "American", ingredients: [
    ing("Eggs", "dairy_eggs"), ing("Whole-grain bread", "pantry_grains"), ing("Tomatoes", "produce"), ing("Butter", "dairy_eggs"),
  ]},
  { name: "Overnight oats with banana and cinnamon", category: "breakfast", cuisine: "American", ingredients: [
    ing("Oats", "pantry_grains"), ing("Banana", "produce"), ing("Cinnamon", "pantry_grains"), ing("Milk", "dairy_eggs"),
  ]},
  { name: "Smoothie (spinach, frozen fruit, banana, milk/yogurt)", category: "breakfast", cuisine: "American", ingredients: [
    ing("Baby spinach", "produce"), ing("Frozen mixed berries", "canned_frozen"), ing("Banana", "produce"), ing("Milk", "dairy_eggs"), ing("Greek yogurt", "dairy_eggs"),
  ]},
  { name: "Avocado toast with a fried egg", category: "breakfast", cuisine: "American", ingredients: [
    ing("Avocado", "produce"), ing("Whole-grain bread", "pantry_grains"), ing("Eggs", "dairy_eggs"),
  ]},
  { name: "Pancakes or waffles with fruit", category: "breakfast", cuisine: "American", ingredients: [
    ing("Pancake or waffle mix", "pantry_grains"), ing("Mixed berries", "produce"), ing("Butter", "dairy_eggs"), ing("Milk", "dairy_eggs"),
  ]},
  { name: "Veggie omelet with toast", category: "breakfast", cuisine: "American", ingredients: [
    ing("Eggs", "dairy_eggs"), ing("Bell peppers", "produce"), ing("Onion", "produce"), ing("Whole-grain bread", "pantry_grains"), ing("Shredded cheese", "dairy_eggs"),
  ]},
  { name: "Breakfast burrito (eggs, black beans, cheese, salsa)", category: "breakfast", cuisine: "Mexican", ingredients: [
    ing("Eggs", "dairy_eggs"), ing("Kidney or black beans", "canned_frozen"), ing("Shredded cheese", "dairy_eggs"), ing("Tortillas", "pantry_grains"), ing("Salsa", "condiments"),
  ]},
  { name: "Cottage cheese with pineapple and toasted almonds", category: "breakfast", cuisine: "American", ingredients: [
    ing("Cottage cheese", "dairy_eggs"), ing("Pineapple", "produce"), ing("Almonds", "pantry_grains"),
  ]},
  { name: "Bagel with cream cheese and smoked salmon", category: "breakfast", cuisine: "American", ingredients: [
    ing("Bagels", "pantry_grains"), ing("Cream cheese", "dairy_eggs"), ing("Smoked salmon", "meat_seafood"),
  ]},
  { name: "Chia pudding with mango", category: "breakfast", cuisine: "American", ingredients: [
    ing("Chia seeds", "pantry_grains"), ing("Milk", "dairy_eggs"), ing("Mango", "produce"), ing("Honey", "pantry_grains"),
  ]},
  { name: "Breakfast hash (potatoes, peppers, onions, egg on top)", category: "breakfast", cuisine: "American", ingredients: [
    ing("Potatoes", "produce"), ing("Bell peppers", "produce"), ing("Onion", "produce"), ing("Eggs", "dairy_eggs"),
  ]},

  // ---------------- Lunch ----------------
  { name: "Turkey and avocado wraps", category: "lunch", cuisine: "American", ingredients: [
    ing("Deli turkey", "meat_seafood"), ing("Avocado", "produce"), ing("Tortillas", "pantry_grains"), ing("Mixed greens/lettuce", "produce"),
  ]},
  { name: "Leftover-protein + rice/veggie bowl", category: "lunch", cuisine: "American", ingredients: [
    ing("Rice", "pantry_grains"), ing("Broccoli", "produce"),
  ]},
  { name: "Caprese sandwiches", category: "lunch", cuisine: "Italian", ingredients: [
    ing("Mozzarella", "dairy_eggs"), ing("Tomatoes", "produce"), ing("Basil", "produce"), ing("Balsamic vinegar", "pantry_grains"), ing("Whole-grain bread", "pantry_grains"),
  ]},
  { name: "Big salad with grilled protein and chickpeas/feta", category: "lunch", cuisine: "Mediterranean", ingredients: [
    ing("Mixed greens/lettuce", "produce"), ing("Chickpeas", "canned_frozen"), ing("Feta cheese", "dairy_eggs"), ing("Cucumber", "produce"), ing("Chicken thighs", "meat_seafood"),
  ]},
  { name: "Leftover chili or soup", category: "lunch", cuisine: "American", ingredients: [] },
  { name: "Grain bowl with roasted veggies and vinaigrette", category: "lunch", cuisine: "American", ingredients: [
    ing("Quinoa", "pantry_grains"), ing("Broccoli", "produce"), ing("Sweet potatoes", "produce"), ing("Olive oil", "pantry_grains"), ing("Balsamic vinegar", "pantry_grains"),
  ]},
  { name: "Tuna or chicken salad on greens", category: "lunch", cuisine: "American", ingredients: [
    ing("Canned tuna", "canned_frozen"), ing("Mixed greens/lettuce", "produce"), ing("Mayo", "condiments"),
  ]},
  { name: "Soup + half sandwich combo", category: "lunch", cuisine: "American", ingredients: [
    ing("Whole-grain bread", "pantry_grains"), ing("Shredded cheese", "dairy_eggs"), ing("Canned soup", "canned_frozen"),
  ]},
  { name: "Mediterranean plate (hummus, pita, olives, cucumber, feta)", category: "lunch", cuisine: "Mediterranean", ingredients: [
    ing("Hummus", "pantry_grains"), ing("Pita bread", "pantry_grains"), ing("Olives", "condiments"), ing("Cucumber", "produce"), ing("Feta cheese", "dairy_eggs"),
  ]},
  { name: "Quesadillas with black beans and peppers", category: "lunch", cuisine: "Mexican", ingredients: [
    ing("Tortillas", "pantry_grains"), ing("Kidney or black beans", "canned_frozen"), ing("Bell peppers", "produce"), ing("Shredded cheese", "dairy_eggs"),
  ]},
  { name: "Leftover pizza or pasta", category: "lunch", cuisine: "American", ingredients: [] },
  { name: "Taco salad with seasoned beef or chicken", category: "lunch", cuisine: "Mexican", ingredients: [
    ing("Ground beef or steak strips", "meat_seafood"), ing("Mixed greens/lettuce", "produce"), ing("Shredded cheese", "dairy_eggs"), ing("Salsa", "condiments"),
  ]},
  { name: "Caprese pasta salad with cherry tomatoes and mozzarella", category: "lunch", cuisine: "Italian", ingredients: [
    ing("Pasta", "pantry_grains"), ing("Tomatoes", "produce"), ing("Mozzarella", "dairy_eggs"), ing("Basil", "produce"), ing("Olive oil", "pantry_grains"),
  ]},
  { name: "Leftover enchiladas or burrito bowl", category: "lunch", cuisine: "Mexican", ingredients: [] },

  // ---------------- Dinner ----------------
  { name: "Sheet-pan chicken thighs, roasted veggies, sweet potato", category: "dinner", cuisine: "American", ingredients: [
    ing("Chicken thighs", "meat_seafood", "1.5-2 lb"), ing("Broccoli", "produce"), ing("Sweet potatoes", "produce"), ing("Olive oil", "pantry_grains"),
  ]},
  { name: "Beef or tofu stir-fry with rice", category: "dinner", cuisine: "Asian", ingredients: [
    ing("Ground beef or steak strips", "meat_seafood", "1 lb"), ing("Rice", "pantry_grains"), ing("Bell peppers", "produce"), ing("Broccoli", "produce"),
  ]},
  { name: "Baked salmon, green beans, quinoa", category: "dinner", cuisine: "American", ingredients: [
    ing("Salmon fillets", "meat_seafood", "2"), ing("Green beans", "produce", "1 lb"), ing("Quinoa", "pantry_grains"), ing("Lemon", "produce"),
  ]},
  { name: "Turkey or veggie chili with cornbread", category: "dinner", cuisine: "American", ingredients: [
    ing("Ground turkey", "meat_seafood", "1 lb"), ing("Diced tomatoes", "canned_frozen"), ing("Kidney or black beans", "canned_frozen"), ing("Cornbread mix", "pantry_grains"), ing("Onion", "produce"),
  ]},
  { name: "Homemade pizza night", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Pizza dough or crust", "pantry_grains"), ing("Mozzarella", "dairy_eggs"), ing("Tomatoes", "produce"),
  ]},
  { name: "Shrimp or veggie tacos with slaw", category: "dinner", cuisine: "Mexican", ingredients: [
    ing("Shrimp", "meat_seafood", "1 lb"), ing("Tortillas or taco shells", "pantry_grains"), ing("Cabbage or coleslaw mix", "produce"), ing("Lime crema or sour cream + lime", "condiments"),
  ]},
  { name: "Roast chicken, mashed potatoes, green salad", category: "dinner", cuisine: "American", ingredients: [
    ing("Whole chicken", "meat_seafood", "1"), ing("Potatoes", "produce"), ing("Mixed greens/lettuce", "produce"), ing("Butter", "dairy_eggs"),
  ]},
  { name: "Spaghetti and meatballs with garlic bread", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Pasta", "pantry_grains"), ing("Ground beef or steak strips", "meat_seafood"), ing("Garlic", "produce"), ing("Whole-grain bread", "pantry_grains"), ing("Diced tomatoes", "canned_frozen"),
  ]},
  { name: "Pork chops, roasted apples, and Brussels sprouts", category: "dinner", cuisine: "American", ingredients: [
    ing("Pork chops", "meat_seafood"), ing("Apples", "produce"), ing("Brussels sprouts", "produce"),
  ]},
  { name: "Vegetable curry with basmati rice", category: "dinner", cuisine: "Indian", ingredients: [
    ing("Rice", "pantry_grains"), ing("Bell peppers", "produce"), ing("Onion", "produce"), ing("Coconut milk", "canned_frozen"), ing("Curry powder", "pantry_grains"),
  ]},
  { name: "Baked ziti or lasagna (great for leftovers)", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Pasta", "pantry_grains"), ing("Mozzarella", "dairy_eggs"), ing("Diced tomatoes", "canned_frozen"), ing("Ground beef or steak strips", "meat_seafood"),
  ]},
  { name: "Fajitas (chicken, steak, or veggie) with peppers and onions", category: "dinner", cuisine: "Mexican", ingredients: [
    ing("Chicken thighs", "meat_seafood"), ing("Bell peppers", "produce"), ing("Onion", "produce"), ing("Tortillas or taco shells", "pantry_grains"),
  ]},
  { name: "Grilled burgers with a side salad or slaw", category: "dinner", cuisine: "American", ingredients: [
    ing("Ground beef or steak strips", "meat_seafood"), ing("Burger buns", "pantry_grains"), ing("Cabbage or coleslaw mix", "produce"),
  ]},
  { name: "Beef or chicken tacos with pico de gallo and cotija", category: "dinner", cuisine: "Mexican", ingredients: [
    ing("Ground beef or steak strips", "meat_seafood"), ing("Tortillas or taco shells", "pantry_grains"), ing("Tomatoes", "produce"), ing("Onion", "produce"), ing("Cotija cheese", "dairy_eggs"),
  ]},
  { name: "Enchiladas (chicken or cheese) with red or green sauce", category: "dinner", cuisine: "Mexican", ingredients: [
    ing("Chicken thighs", "meat_seafood"), ing("Tortillas or taco shells", "pantry_grains"), ing("Shredded cheese", "dairy_eggs"), ing("Enchilada sauce", "canned_frozen"),
  ]},
  { name: "Chicken or beef burrito bowls with rice, beans, and salsa", category: "dinner", cuisine: "Mexican", ingredients: [
    ing("Chicken thighs", "meat_seafood"), ing("Rice", "pantry_grains"), ing("Kidney or black beans", "canned_frozen"), ing("Salsa", "condiments"),
  ]},
  { name: "Fettuccine alfredo with grilled chicken", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Pasta", "pantry_grains"), ing("Chicken thighs", "meat_seafood"), ing("Butter", "dairy_eggs"), ing("Heavy cream", "dairy_eggs"), ing("Parmesan", "dairy_eggs"),
  ]},
  { name: "Chicken parmesan with spaghetti", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Chicken thighs", "meat_seafood"), ing("Pasta", "pantry_grains"), ing("Diced tomatoes", "canned_frozen"), ing("Mozzarella", "dairy_eggs"),
  ]},
  { name: "Shrimp scampi over linguine", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Shrimp", "meat_seafood"), ing("Pasta", "pantry_grains"), ing("Garlic", "produce"), ing("Butter", "dairy_eggs"), ing("Lemon", "produce"),
  ]},
  { name: "Margherita or pepperoni pizza (homemade)", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Pizza dough or crust", "pantry_grains"), ing("Mozzarella", "dairy_eggs"), ing("Tomatoes", "produce"), ing("Basil", "produce"),
  ]},
  { name: "Beef or cheese stuffed shells", category: "dinner", cuisine: "Italian", ingredients: [
    ing("Jumbo pasta shells", "pantry_grains"), ing("Ground beef or steak strips", "meat_seafood"), ing("Mozzarella", "dairy_eggs"), ing("Diced tomatoes", "canned_frozen"),
  ]},

  // ---------------- Snacks ----------------
  { name: "Apple slices with peanut butter", category: "snack", cuisine: "American", ingredients: [
    ing("Apples", "produce"), ing("Peanut butter", "pantry_grains"),
  ]},
  { name: "Baby carrots with hummus", category: "snack", cuisine: "American", ingredients: [
    ing("Baby carrots", "produce"), ing("Hummus", "pantry_grains"),
  ]},
  { name: "Trail mix or mixed nuts", category: "snack", cuisine: "American", ingredients: [
    ing("Trail mix", "pantry_grains"),
  ]},
  { name: "Greek yogurt with honey", category: "snack", cuisine: "American", ingredients: [
    ing("Greek yogurt", "dairy_eggs"), ing("Honey", "pantry_grains"),
  ]},
  { name: "Popcorn", category: "snack", cuisine: "American", ingredients: [
    ing("Popcorn", "pantry_grains"),
  ]},
  { name: "Cucumber slices with tzatziki", category: "snack", cuisine: "Mediterranean", ingredients: [
    ing("Cucumber", "produce"), ing("Tzatziki", "condiments"),
  ]},
  { name: "Fresh fruit (grapes, orange, pear)", category: "snack", cuisine: "American", ingredients: [
    ing("Grapes", "produce"), ing("Orange", "produce"), ing("Pear", "produce"),
  ]},
  { name: "Dark chocolate square", category: "snack", cuisine: "American", ingredients: [
    ing("Dark chocolate", "pantry_grains"),
  ]},
  { name: "Rice cakes with almond butter", category: "snack", cuisine: "American", ingredients: [
    ing("Rice cakes", "pantry_grains"), ing("Almond butter", "pantry_grains"),
  ]},
  { name: "Hard-boiled eggs", category: "snack", cuisine: "American", ingredients: [
    ing("Eggs", "dairy_eggs"),
  ]},
  { name: "Cheese and whole-grain crackers", category: "snack", cuisine: "American", ingredients: [
    ing("String cheese", "dairy_eggs"), ing("Whole-grain crackers", "pantry_grains"),
  ]},
  { name: "Edamame with sea salt", category: "snack", cuisine: "Asian", ingredients: [
    ing("Edamame", "canned_frozen"),
  ]},
  { name: "Smoothie or protein shake", category: "snack", cuisine: "American", ingredients: [
    ing("Milk", "dairy_eggs"), ing("Protein powder", "pantry_grains"), ing("Banana", "produce"),
  ]},
];

const SECTIONS = [
  { key: "produce", label: "🥬 Produce" },
  { key: "meat_seafood", label: "🥩 Meat & Seafood" },
  { key: "dairy_eggs", label: "🥚 Dairy & Eggs" },
  { key: "pantry_grains", label: "🌾 Pantry & Grains" },
  { key: "canned_frozen", label: "🥫 Canned & Frozen" },
  { key: "condiments", label: "🧂 Condiments & Extras" },
];

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const CATEGORIES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

if (typeof module !== "undefined") module.exports = { SEED_MEALS, SECTIONS, DAYS, CATEGORIES };
