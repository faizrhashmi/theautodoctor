/**
 * Populate Canadian Cities
 * Adds all major Canadian cities organized by province
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Comprehensive list of Canadian cities by province
const CANADIAN_CITIES = {
  'Alberta': [
    'Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Fort McMurray',
    'Grande Prairie', 'Medicine Hat', 'Airdrie', 'Spruce Grove', 'Okotoks',
    'Leduc', 'Cochrane', 'Lloydminster', 'Camrose', 'Brooks'
  ],
  'British Columbia': [
    'Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford',
    'Coquitlam', 'Kelowna', 'Langley', 'Saanich', 'Delta', 'Kamloops',
    'Nanaimo', 'Chilliwack', 'Prince George', 'Vernon', 'Penticton',
    'Campbell River', 'Courtenay', 'Maple Ridge', 'Port Coquitlam',
    'New Westminster', 'North Vancouver', 'West Vancouver', 'White Rock'
  ],
  'Manitoba': [
    'Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Portage la Prairie',
    'Winkler', 'Selkirk', 'Morden', 'Dauphin', 'The Pas'
  ],
  'New Brunswick': [
    'Moncton', 'Saint John', 'Fredericton', 'Dieppe', 'Miramichi',
    'Edmundston', 'Bathurst', 'Campbellton', 'Quispamsis', 'Riverview'
  ],
  'Newfoundland and Labrador': [
    'St. John\'s', 'Mount Pearl', 'Corner Brook', 'Conception Bay South',
    'Paradise', 'Grand Falls-Windsor', 'Gander', 'Portugal Cove-St. Philip\'s',
    'Happy Valley-Goose Bay', 'Torbay'
  ],
  'Nova Scotia': [
    'Halifax', 'Dartmouth', 'Sydney', 'Truro', 'New Glasgow',
    'Glace Bay', 'Kentville', 'Amherst', 'Yarmouth', 'Bridgewater'
  ],
  'Ontario': [
    'Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London',
    'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Richmond Hill', 'Oakville',
    'Burlington', 'Oshawa', 'Barrie', 'St. Catharines', 'Cambridge',
    'Kingston', 'Whitby', 'Guelph', 'Sudbury', 'Thunder Bay', 'Waterloo',
    'Brantford', 'Pickering', 'Niagara Falls', 'Peterborough', 'Sault Ste. Marie',
    'Sarnia', 'Belleville', 'Welland', 'North Bay', 'Cornwall', 'Timmins',
    'Chatham-Kent', 'Milton', 'Ajax', 'Newmarket', 'Clarington', 'Halton Hills',
    'Aurora', 'Caledon', 'Georgina', 'King', 'Stouffville', 'Orangeville'
  ],
  'Prince Edward Island': [
    'Charlottetown', 'Summerside', 'Stratford', 'Cornwall', 'Montague',
    'Kensington', 'Souris', 'Alberton', 'Tignish', 'Georgetown'
  ],
  'Quebec': [
    'Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke',
    'Saguenay', 'Trois-Rivières', 'Terrebonne', 'Saint-Jean-sur-Richelieu',
    'Repentigny', 'Brossard', 'Drummondville', 'Saint-Jérôme', 'Granby',
    'Blainville', 'Saint-Hyacinthe', 'Shawinigan', 'Dollard-des-Ormeaux',
    'Rimouski', 'Victoriaville', 'Mirabel', 'Joliette', 'Sorel-Tracy',
    'Vaudreuil-Dorion', 'Val-d\'Or', 'Sept-Îles', 'Alma'
  ],
  'Saskatchewan': [
    'Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current',
    'Yorkton', 'North Battleford', 'Estevan', 'Weyburn', 'Martensville'
  ],
  'Northwest Territories': [
    'Yellowknife', 'Hay River', 'Inuvik', 'Fort Smith', 'Behchokǫ̀'
  ],
  'Nunavut': [
    'Iqaluit', 'Rankin Inlet', 'Arviat', 'Baker Lake', 'Cambridge Bay'
  ],
  'Yukon': [
    'Whitehorse', 'Dawson City', 'Watson Lake', 'Haines Junction', 'Carmacks'
  ]
}

async function populateCities() {
  console.log('🏙️  Starting Canadian cities population...\n')

  // First, ensure we have Canada in the supported_countries table
  const { data: canadaCheck } = await supabase
    .from('supported_countries')
    .select('*')
    .eq('country_code', 'CA')
    .single()

  if (!canadaCheck) {
    console.log('📍 Adding Canada to supported_countries table...')
    const { error } = await supabase
      .from('supported_countries')
      .insert({
        country_name: 'Canada',
        country_code: 'CA',
        default_timezone: 'America/Toronto'
      })

    if (error) {
      console.error('❌ Failed to add Canada:', error)
      return
    }
    console.log('✅ Canada added\n')
  } else {
    console.log('✅ Canada already exists\n')
  }

  // Process each province
  let totalAdded = 0
  let totalSkipped = 0

  for (const [province, cities] of Object.entries(CANADIAN_CITIES)) {
    console.log(`\n📍 Processing ${province}...`)

    for (const cityName of cities) {
      // Check if city already exists
      const { data: existing } = await supabase
        .from('major_cities')
        .select('id')
        .eq('country_code', 'CA')
        .eq('state_province', province)
        .eq('city_name', cityName)
        .single()

      if (existing) {
        console.log(`  ⏭️  Skipped: ${cityName} (already exists)`)
        totalSkipped++
        continue
      }

      // Determine timezone based on province
      let timezone = 'America/Toronto' // Default Eastern
      if (['British Columbia', 'Yukon'].includes(province)) {
        timezone = 'America/Vancouver' // Pacific
      } else if (['Alberta', 'Northwest Territories', 'Nunavut'].includes(province)) {
        timezone = 'America/Edmonton' // Mountain
      } else if (['Saskatchewan', 'Manitoba'].includes(province)) {
        timezone = 'America/Winnipeg' // Central
      } else if (['Quebec', 'Ontario', 'Nunavut'].includes(province)) {
        timezone = 'America/Toronto' // Eastern
      } else if (['New Brunswick', 'Nova Scotia', 'Prince Edward Island', 'Newfoundland and Labrador'].includes(province)) {
        timezone = province === 'Newfoundland and Labrador' ? 'America/St_Johns' : 'America/Halifax' // Atlantic/Newfoundland
      }

      // Add city
      const { error } = await supabase
        .from('major_cities')
        .insert({
          city_name: cityName,
          state_province: province,
          country_code: 'CA',
          timezone: timezone,
          is_active: true
        })

      if (error) {
        console.error(`  ❌ Failed to add ${cityName}:`, error.message)
      } else {
        console.log(`  ✅ Added: ${cityName}`)
        totalAdded++
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`\n🎉 Population complete!`)
  console.log(`✅ Added: ${totalAdded} cities`)
  console.log(`⏭️  Skipped: ${totalSkipped} cities (already existed)`)
  console.log(`📊 Total provinces/territories: ${Object.keys(CANADIAN_CITIES).length}`)
}

populateCities()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
