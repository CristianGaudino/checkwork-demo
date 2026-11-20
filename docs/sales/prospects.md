# Prospects: car dealers able and willing to pay

Tracking: #215 (Cork #216, Limerick #217, Galway #218, Waterford #219, Kerry #220). Rules and scoring: [ideal-client.md](ideal-client.md). Sales cards for tiers A and B: [cards/](cards/).

**331 dealers looked at, 255 kept, 76 skipped.** Tier A: 32, B: 80, C: 143. Researched and checked on 20 November 2026.

## How this was built
- Lists from web research per county, then DoneDeal's and CarsIreland's public county dealer directories to fill gaps. DoneDeal began showing a CAPTCHA to automated requests partway through; it was not worked around.
- A validation pass re-checked every "no website" claim (46 of 50 were wrong: most dealers pay for CarsIreland, HappyDealer or DoneDeal template sites) and the top dealers' stock and reviews.
- Every kept dealer's homepage was swept on a phone and a desktop: load, HTTPS, layout on a phone, script errors, serious accessibility failures, and whether it sends buyers off-site, shows finance, trade-in, an enquiry form, reviews or WhatsApp. One request per site, with pauses.
- Stock is the dealer's DoneDeal or CarsIreland ad count, or its own site's count; typical price is the median of the first page of ads, so franchise figures lean high (new cars first).
- Sales points on the cards were re-checked against the live sites when written.

## Ranked
| # | Tier | Score | County | Dealer | Cars | Typical | Reviews | Site | Openings from the sweep (the cards have the checked ones) | |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | A | 86 | Cork | Cavanaghs of Charleville | 175 | €25k | 910 | WordPress (no builder credit) | 3 script errors; 8 serious accessibility failures; no finance on the home page | [card](cards/cork.md#cavanaghs-of-charleville-charleville-and-mallow--tier-a-86100-able-50-willing-18-opening-18) |
| 2 | A | 84 | Cork | Blackwater Motors | 654 | €37k | 683 |  | 2 script errors; 1 serious accessibility failures; no enquiry form on the home page | [card](cards/cork.md#blackwater-motors-cork-airport-road-fermoy-skibbereen--tier-a-84100-able-50-willing-13-opening-21) |
| 3 | A | 83 | Cork | Kevin O'Leary Group | 218 | €30k | 479 | HappyDealer | 5 serious accessibility failures; no finance on the home page; no trade-in on the home page | [card](cards/cork.md#kevin-oleary-group-silversprings-cork-city-and-bandon--tier-a-83100-able-50-willing-18-opening-15) |
| 4 | A | 83 | Galway | Colm Quinn BMW Galway | 165 | €54k | 481 | Carzone (footer 'Site by Carzone'), used stock fed from cars.ie | 2 script errors; 3 serious accessibility failures; sends buyers to DoneDeal or CarsIreland | [card](cards/galway.md#colm-quinn-bmw-galway-galway-city-tuam-road--tier-a-83100-able-50-willing-18-opening-15) |
| 5 | A | 83 | Waterford | Auto Boland (Boland Group: Waterford City Ford, Volvo, Land Rover, Fiat/Alfa/Jeep, Honda, Audi Waterford, Boland Citroën, Volkswagen Waterford) | 85 | €39k | 356 | mtc (footer: 'Platform by mtc') | 1 script errors; 2 serious accessibility failures; no trade-in on the home page | [card](cards/waterford.md#auto-boland-waterford-city-cork-road-butlerstown-roundabout--tier-a-86100-able-50-willing-18-opening-18) |
| 6 | A | 80 | Cork | Nyhan Motors / Car Superstore | 253 | €31k | 249 | HappyDealer | 1 script errors; 7 serious accessibility failures; no trade-in on the home page | [card](cards/cork.md#nyhan-motors--car-superstore-bandon--tier-a-80100-able-50-willing-18-opening-12) |
| 7 | A | 80 | Galway | Western Motors Ltd | 88 | €37k | 765 | HappyDealer (footer 'Website by HappyDealer') | 1 script errors; 9 serious accessibility failures; no trade-in on the home page | [card](cards/galway.md#western-motors-ltd-ballybrit-galway--tier-a-80100-able-50-willing-18-opening-12) |
| 8 | A | 80 | Limerick | Lyons of Limerick | 160 | €24k | 475 | NetDirector (Keyloop) | 4 script errors; 3 serious accessibility failures; no trade-in on the home page | [card](cards/limerick.md#lyons-of-limerick-limerick-city-ballysimon-road--tier-a-83100-able-50-willing-18-opening-15) |
| 9 | A | 80 | Limerick | Brian Geary Toyota | 127 | €32k | 332 | Toyota Ireland template (footer: Copyright Toyota Ireland) | 4 script errors; 3 serious accessibility failures; 332 Google reviews not shown | [card](cards/limerick.md#brian-geary-toyota-raheen-limerick-also-rathkeale--tier-a-83100-able-50-willing-18-opening-15) |
| 10 | A | 79 | Kerry | Reen's Rathmore (Reens Car Sales) | 55 | €33k | 215 | Appears to be a Peugeot dealer template (external Peugeot booking links); not confirmed | 3 script errors; 6 serious accessibility failures; no enquiry form on the home page | [card](cards/kerry.md#reens-rathmore-reens-garage-rathmore--tier-a-79100-able-40-willing-18-opening-21) |
| 11 | A | 78 | Kerry | Divanes Kerry (Divane Volkswagen) | 339 | €41k | 407 | Volkswagen dealer site (page title "Volkswagen / Down for maintenance") | site answers 503; 1 script errors; no finance on the home page | [card](cards/kerry.md#divane-volkswagen-divanes-kerry-castleisland--tier-a-81100-able-45-willing-15-opening-21) |
| 12 | A | 77 | Galway | Tom Doyle Motor | 107 | €15k | 88 | Carussel (footer 'Created by Carussel'), the Opel/Stellantis dealer template linked to opel.ie | 1 script errors; 2 serious accessibility failures; no finance on the home page | [card](cards/galway.md#tom-doyle-motor-loughrea--tier-a-80100-able-45-willing-14-opening-21) |
| 13 | A | 77 | Limerick | Hinchy's (Kia) | 274 | €40k | 809 | HappyDealer (footer: Website by HappyDealer) | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/limerick.md#hinchys-kia-limerick-city-ennis-road-and-garryspillane-knocklong--tier-a-77100-able-50-willing-18-opening-9) |
| 14 | A | 75 | Galway | Tony Burke Motors | 97 | €33k | 333 | Toyota Ireland dealer template (footer '© Toyota Ireland') | 4 script errors; 3 serious accessibility failures; 333 Google reviews not shown | [card](cards/galway.md#tony-burke-motors-ballybrit-galway--tier-a-78100-able-45-willing-18-opening-15) |
| 15 | A | 75 | Waterford | John Kelly (Waterford) Ltd (Opel) | 144 |  | 514 | Opel Ireland dealer template (footer 'developed by Carussel') | 1 script errors; 2 serious accessibility failures; no finance on the home page | [card](cards/waterford.md#john-kelly-waterford-ltd-waterford-city-waterford-business-park--tier-a-78100-able-39-willing-18-opening-21) |
| 16 | A | 74 | Galway | Al Hayes Motors | 458 | €21k | 392 | NetDirector (Keyloop) dealer platform, footer credit | 2 script errors; 3 serious accessibility failures; no WhatsApp | [card](cards/galway.md#al-hayes-motors-portumna-also-tuam--tier-a-74100-able-50-willing-15-opening-9) |
| 17 | A | 74 | Limerick | James Barry Motors | 131 | €19k | 252 | CarsIreland (footer: Powered by CarsIreland) | 2 script errors; 6 serious accessibility failures | [card](cards/limerick.md#james-barry-motors-limerick-city-dock-road--tier-a-80100-able-50-willing-18-opening-12) |
| 18 | A | 73 | Cork | Mallow Road Motors | 120 | €23k | 143 | HappyDealer | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/cork.md#mallow-road-motors-kilnap--blarney-mallow-road-cork--tier-a-73100-able-50-willing-14-opening-9) |
| 19 | A | 72 | Galway | Kenny Galway | 139 | €30k | 353 | CarsIreland.ie (footer 'Powered by CarsIreland') | 6 script errors; 6 serious accessibility failures; no WhatsApp | [card](cards/galway.md#kenny-galway-galway-city-tuam-road--tier-a-78100-able-45-willing-18-opening-15) |
| 20 | A | 72 | Galway | Cunningham Autopoint | 130 | €39k | 261 | HappyDealer (footer 'website by happydealer.ie') | 2 script errors; 6 serious accessibility failures; no trade-in on the home page | [card](cards/galway.md#cunningham-autopoint-oranmore--tier-a-72100-able-45-willing-15-opening-12) |
| 21 | A | 72 | Kerry | Kerry Motor Works (Benner's Garage Ltd) | 182 | €31k | 454 | NetDirector (Keyloop), per footer | 2 script errors; 4 serious accessibility failures; no trade-in on the home page | [card](cards/kerry.md#kerry-motor-works-benners-garage-ltd-tralee--tier-a-72100-able-45-willing-15-opening-12) |
| 22 | A | 72 | Kerry | Kellihers Toyota Tralee | 105 | €23k | 345 | Toyota Ireland dealer template (copyright Toyota Ireland) | 4 script errors; 3 serious accessibility failures; 345 Google reviews not shown | [card](cards/kerry.md#kellihers-toyota-tralee--tier-a-75100-able-45-willing-15-opening-15) |
| 23 | A | 72 | Kerry | Ahern's of Kerry (Aherns Motor Group) | 111 | €29k | 236 | HappyDealer (footer: website by happydealer.ie) | 2 script errors; 6 serious accessibility failures; no WhatsApp | [card](cards/kerry.md#aherns-of-kerry-aherns-motor-group-castleisland--tier-a-72100-able-45-willing-18-opening-9) |
| 24 | A | 72 | Limerick | Limerick Motor Centre | 171 | €39k | 1551 | CarsIreland (footer: Powered by CarsIreland) | 6 script errors; 6 serious accessibility failures; no WhatsApp | [card](cards/limerick.md#limerick-motor-centre-limerick-city-ballysimon-road--tier-a-78100-able-45-willing-18-opening-15) |
| 25 | A | 72 | Limerick | Frank Hogan Ltd | 303 | €36k | 839 | HappyDealer (footer: Website by HappyDealer) | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/limerick.md#frank-hogan-ltd-limerick-city-dublin-road--tier-a-72100-able-45-willing-18-opening-9) |
| 26 | A | 72 | Limerick | Dennehy Motors | 92 | €20k | 1255 | CarsIreland (footer: Powered by Carsireland) | 4 script errors; 6 serious accessibility failures; no trade-in on the home page | [card](cards/limerick.md#dennehy-motors-limerick-city-riverside-park-dock-road--tier-a-75100-able-45-willing-18-opening-12) |
| 27 | A | 72 | Limerick | AutoXpress | 332 | €25k | 709 | HappyDealer (footer: Website by HappyDealer) | 1 script errors; 8 serious accessibility failures; no trade-in on the home page | [card](cards/limerick.md#autoxpress-limerick-city-castlepark-dock-road--tier-a-72100-able-42-willing-18-opening-12) |
| 28 | A | 72 | Waterford | George Corbett Motors | 175 | €40k | 355 | HappyDealer (footer: 'website by happydealer.ie') | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/waterford.md#george-corbett-motors-waterford-city-cork-road--tier-a-72100-able-45-willing-18-opening-9) |
| 29 | A | 71 | Cork | O'Callaghan Motors (Toyota Kanturk) | 92 | €27k | 166 | Toyota Ireland dealer platform | 5 script errors; 3 serious accessibility failures; 166 Google reviews not shown | [card](cards/cork.md#ocallaghan-motors-toyota-kanturk-kanturk--tier-a-74100-able-45-willing-14-opening-15) |
| 30 | A | 71 | Waterford | T & C Motors Ltd | 110 | €18k | 88 | GForces NetDirector (UK dealer website platform) | 4 script errors; 4 serious accessibility failures; no trade-in on the home page | [card](cards/waterford.md#t--c-motors-ltd-waterford-city-inner-ring-road--tier-a-74100-able-45-willing-14-opening-15) |
| 31 | A | 70 | Waterford | BYD Waterford | 98 | €37k |  | BYD dealer template (manufacturer platform, no credit shown) | 49 script errors; 2 serious accessibility failures; no enquiry form on the home page | [card](cards/waterford.md#byd-waterford-waterford-city-inner-ring-road--tier-a-70100-able-45-willing-7-opening-18) |
| 32 | A | 67 | Limerick | John Culhane Car Sales | 104 | €28k | 62 | none (no own website) | Tier set by hand: The best plain website sale in Limerick: 104 cars, and the domain on its DoneDeal page doesn't exist. | [card](cards/limerick.md#john-culhane-car-sales-askeaton--tier-b-67100) |
| 33 | B | 75 | Galway | Connolly's Motor Group (Galway: Audi, Mercedes-Benz, Hyundai, Volvo) | 561 | €66k | 2191 |  | Tier set by hand: Strong site already (stock by brand and branch, finance on each car, Sell My Car, leasing, review badge): a dashboard sale only, decided by the group's head office in Ballina. | [card](cards/galway.md#connollys-motor-group-galway-audi-mercedes-benz-hyundai-volvo-ballybrit-galway--tier-a-75100-able-50-willing-10-opening-15) |
| 34 | B | 75 | Galway | Monaghans Galway | 138 | €30k | 1540 | CarsIreland.ie (footer 'Powered by CarsIreland.ie') | Tier set by hand: Already has Get a Valuation, finance, test drives and a 4.9 rating badge; a dashboard and reviews sale. | [card](cards/galway.md#monaghans-galway-galway-city-tuam-road--tier-a-78100-able-45-willing-18-opening-15) |
| 35 | B | 72 | Cork | Noel Deasy Cars | 126 | €38k | 1432 | mtc | Tier set by hand: Modern mtc site with chat, WhatsApp, test drive, Sell Your Car and its reviews shown: a dashboard sale only. | [card](cards/cork.md#noel-deasy-cars-blackpool-cork-city--tier-a-75100-able-45-willing-18-opening-12) |
| 36 | B | 71 | Galway | Sheils Galway | 59 | €25k | 620 | CRD Media (footer credit; asset paths suggest WordPress) | Tier set by hand: Already has Value My Car, a finance calculator, test drive booking and paid chat; the only real gap is reviews. | [card](cards/galway.md#sheils-galway-galway-headford-road--tier-a-71100-able-41-willing-15-opening-15) |
| 37 | B | 70 | Cork | Grandons Toyota Cork | 69 | €29k | 998 | Toyota Ireland dealer platform | Tier set by hand: Runs on Toyota Ireland's site, which the dealer can't change: dashboard and reviews only. | [card](cards/cork.md#grandons-toyota-cork-glanmire--tier-a-73100-able-40-willing-18-opening-15) |
| 38 | B | 70 | Cork | Cogans Toyota Cork | 54 | €30k | 1411 | Toyota Ireland dealer platform | Tier set by hand: Runs on Toyota Ireland's site, which the dealer can't change: dashboard and reviews only. | [card](cards/cork.md#cogans-toyota-cork-carrigaline--tier-a-73100-able-40-willing-18-opening-15) |
| 39 | B | 69 | Kerry | Adams of Tralee | 86 | €33k | 1051 | HappyDealer (footer 'website by happydealer.ie') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/kerry.md#adams-of-tralee-tralee--tier-b-69100-able-45-willing-15-opening-9) |
| 40 | B | 68 | Cork | Motorview | 161 | €45k | 178 | HappyDealer | 2 script errors; 7 serious accessibility failures; no WhatsApp | [card](cards/cork.md#motorview-midleton--tier-b-68100) |
| 41 | B | 68 | Cork | Bandon Motors | 99 | €37k | 150 | HappyDealer | 5 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/cork.md#bandon-motors-bandon--tier-b-68100) |
| 42 | B | 68 | Cork | Newmarket Motors | 100 | €39k | 168 | HappyDealer | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/cork.md#newmarket-motors-newmarket--tier-b-68100) |
| 43 | B | 68 | Kerry | McElligott's Kia Tralee | 67 | €47k | 1003 |  | 4 serious accessibility failures; no enquiry form on the home page; no trade-in on the home page | [card](cards/kerry.md#mcelligotts-kia-tralee-tralee--tier-b-68100-able-40-willing-13-opening-15) |
| 44 | B | 68 | Waterford | T Farrell & Sons (Thomas Farrell & Sons / Tramore Car Centre) | 143 |  | 112 |  | Tier set by hand: Only the old tramoregarages.ie certificate fails; plain http goes to a working CarsIreland site (farrellautoport.ie) with stock, trade-in, test drive and reviews. | [card](cards/waterford.md#t-farrell--sons-tramore-and-waterford-city--tier-b-68100-able-44-willing-9-opening-15) |
| 45 | B | 68 | Waterford | Walsh's Car Sales | 62 | €30k | 75 | HappyDealer (footer: happydealer.ie) | 1 script errors; 7 serious accessibility failures; no WhatsApp | [card](cards/waterford.md#walshs-car-sales-waterford-city-cork-road-and-ferrybank--tier-b-68100-able-45-willing-14-opening-9) |
| 46 | B | 67 | Galway | Woodland Motor Co | 78 | €27k | 306 | HappyDealer (footer 'Website by HappyDealer') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/galway.md#woodland-motor-co-claregalway--tier-b-67100) |
| 47 | B | 67 | Limerick | Munster Trade Sales | 78 | €26k | 224 | HappyDealer (footer 'website by happydealer.ie') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/limerick.md#munster-trade-sales-limerick-city-corbally-road--tier-b-67100) |
| 48 | B | 67 | Waterford | Paul O'Connor Cars | 92 | €21k | 559 | HappyDealer (footer: happydealer.ie) | 2 script errors; 8 serious accessibility failures; no trade-in on the home page | [card](cards/waterford.md#paul-oconnor-cars-dungarvan--tier-b-67100-able-37-willing-18-opening-12) |
| 49 | B | 66 | Cork | Johnson & Perrott Motor Group (JPMG) | 457 |  |  | Dmac Media | 5 serious accessibility failures; no finance on the home page; no trade-in on the home page | [card](cards/cork.md#johnson--perrott-motor-group-jpmg-bishopstown-douglas-mahon-point--tier-b-66100) |
| 50 | B | 66 | Galway | JJ Fleming & Company Ltd | 46 |  | 113 | Opel Ireland dealer template (footer 'developed by Carussel') | 1 script errors; 2 serious accessibility failures; no finance on the home page | [card](cards/galway.md#jj-fleming--company-ltd-galway-tuam-road--tier-b-69100) |
| 51 | B | 66 | Galway | Galway Autos | 104 | €16k | 559 | CarsIreland (footer 'Powered by' CarsIreland) | 4 script errors; 6 serious accessibility failures; no trade-in on the home page | [card](cards/galway.md#galway-autos-galway-city-tuam-road-and-loughrea--tier-b-69100) |
| 52 | B | 65 | Cork | Colemans Millstreet | 54 | €19k | 191 | Kia Ireland dealer page only | site did not load (page.goto: Timeout 30000ms exceeded.) | [card](cards/cork.md#colemans-millstreet-millstreet--tier-b-65100) |
| 53 | B | 65 | Cork | O'Flynn Motors | 70 | €28k |  | no credit shown (small custom site) | 3 script errors; 6 serious accessibility failures; no enquiry form on the home page | [card](cards/cork.md#oflynn-motors-mallow-limerick-road--tier-b-65100) |
| 54 | B | 65 | Limerick | Pat Tiernan Motors | 95 | €25k | 157 | HappyDealer (footer: website by happydealer.ie) | 7 serious accessibility failures; no WhatsApp | [card](cards/limerick.md#pat-tiernan-motors-limerick-city-ballysimon-road--tier-b-65100) |
| 55 | B | 64 | Cork | Lehane Motors (Toyota & Lexus) | 88 | €31k |  | Toyota Ireland dealer platform | 6 script errors; 3 serious accessibility failures; no WhatsApp | [card](cards/cork.md#lehane-motors-toyota--lexus-airport-road-cork--tier-b-67100) |
| 56 | B | 64 | Kerry | Randles Bros | 51 | €27k | 51 | HappyDealer (footer: website by happydealer.ie) | 3 script errors; 7 serious accessibility failures; no WhatsApp | [card](cards/kerry.md#randles-bros-tralee-and-killarney--tier-b-64100-able-41-willing-14-opening-9) |
| 57 | B | 64 | Kerry | Liam Lynch Motors (Liam Lynch Skoda) | 76 | €33k | 239 | HappyDealer (footer 'website by happydealer.ie') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/kerry.md#liam-lynch-motors-skoda-farranfore--tier-b-64100-able-40-willing-15-opening-9) |
| 58 | B | 64 | Kerry | BG Motors Ltd | 128 | €31k | 218 | HappyDealer (footer: Website by HappyDealer) | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/kerry.md#bg-motors-ltd-killarney--tier-b-64100-able-37-willing-18-opening-9) |
| 59 | B | 63 | Cork | O'Connor Car Centre | 154 | €19k | 183 | HappyDealer | 1 script errors; 8 serious accessibility failures; no trade-in on the home page | [card](cards/cork.md#oconnor-car-centre-little-island--tier-b-63100) |
| 60 | B | 63 | Cork | Great Island Motors | 174 | €15k |  | none found (no website listed on CarsIreland; greatislandmotors.com only serves a 'Redirecting...' page, not confirmed as theirs) | no website found | [card](cards/cork.md#great-island-motors-cobh-rushbrooke--tier-b-63100) |
| 61 | B | 63 | Kerry | Billy Naughton Ltd | 59 | €40k | 100 | CarsIreland (footer: Powered by CarsIreland) | 6 script errors; 6 serious accessibility failures; no WhatsApp | [card](cards/kerry.md#billy-naughton-ltd-tralee--tier-b-69100-able-40-willing-14-opening-15) |
| 62 | B | 62 | Kerry | Donagh Hickey Motors | 52 | €15k | 182 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | site did not load (page.goto: Timeout 30000ms exceeded.) | [card](cards/kerry.md#donagh-hickey-motors-rathmore--tier-b-62100-able-36-willing-11-opening-15) |
| 63 | B | 61 | Cork | Dan Seaman Motors | 134 | €38k |  | HappyDealer ('Website by HappyDealer') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/cork.md#dan-seaman-motors-forge-hill-cork-city--tier-b-61100) |
| 64 | B | 61 | Cork | Finbarr Galvin Bandon | 121 | €36k |  | HappyDealer ('Website by HappyDealer') | 8 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/cork.md#finbarr-galvin-bandon-bandon--tier-b-61100) |
| 65 | B | 60 | Galway | Kia Renmore | 67 | €40k | 153 | happydealer.ie (footer: website by happydealer.ie) | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/galway.md#kia-renmore-galway-renmore--tier-b-60100) |
| 66 | B | 60 | Galway | Adrian Quinn Car Sales | 80 | €55k | 114 | HappyDealer (footer 'website by happydealer.ie') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/galway.md#adrian-quinn-car-sales-ardrahan--tier-b-60100) |
| 67 | B | 59 | Cork | Cork City Ford Centre | 62 | €31k |  | Ford Ireland dealer template (manufacturer platform) | 12 script errors; 4 serious accessibility failures; no trade-in on the home page | [card](cards/cork.md#cork-city-ford-centre-forge-hill-cork-city--tier-b-59100) |
| 68 | B | 59 | Galway | Parsons Garage | 42 | €28k | 183 | Toyota Ireland dealer platform (footer: Copyright Toyota Ireland; images on 'deveire' domains) | 5 script errors; 3 serious accessibility failures; 183 Google reviews not shown | [card](cards/galway.md#parsons-garage-tuam--tier-b-62100) |
| 69 | B | 59 | Galway | AutoXpress Galway | 100 |  | 67 | HappyDealer (footer credit) | 1 script errors; 8 serious accessibility failures; no trade-in on the home page | [card](cards/galway.md#autoxpress-galway-ballybrit--tier-b-59100) |
| 70 | B | 59 | Kerry | Autopoint Motor Group | 75 | €24k | 335 | Custom site (no builder credit) | 4 serious accessibility failures; no enquiry form on the home page; no trade-in on the home page | [card](cards/kerry.md#autopoint-motor-group-tralee--tier-b-59100-able-32-willing-15-opening-12) |
| 71 | B | 59 | Limerick | Cardian | 49 | €73k | 269 | HappyDealer (footer: Website by HappyDealer) | 8 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/limerick.md#cardian-limerick-city-eastpoint-ballysimon-road--tier-b-59100) |
| 72 | B | 59 | Limerick | Adams of Glin | 73 | €29k | 21 | HappyDealer (footer 'website by happydealer.ie') | 1 script errors; 7 serious accessibility failures; no trade-in on the home page | [card](cards/limerick.md#adams-of-glin-glin--tier-b-59100) |
| 73 | B | 59 | Waterford | Sheridan Waterford (Kia) | 53 | €22k | 170 | HappyDealer (footer: 'Website by HappyDealer') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/waterford.md#sheridan-waterford-kia-waterford-city-cork-road--tier-b-59100-able-36-willing-14-opening-9) |
| 74 | B | 59 | Waterford | Tom Murphy Car Sales (Toyota and Lexus) | 30 | €32k | 613 | Toyota Ireland dealer template (footer '2026 Copyright Toyota Ireland') | 4 script errors; 3 serious accessibility failures; 613 Google reviews not shown | [card](cards/waterford.md#tom-murphy-car-sales-toyota-and-lexus-waterford-city-cork-road--tier-b-62100-able-29-willing-18-opening-15) |
| 75 | B | 58 | Galway | M6 Motors | 89 | €38k | 393 | HappyDealer (footer 'website by happydealer.ie') | 2 script errors; 6 serious accessibility failures | [card](cards/galway.md#m6-motors-ballinasloe--tier-b-58100) |
| 76 | B | 57 | Galway | Hogan Motors | 108 | €17k | 83 | HappyDealer (footer 'Website by HappyDealer') | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/galway.md#hogan-motors-galway-city-tuam-road--tier-b-57100) |
| 77 | B | 57 | Limerick | D & L O'Connell Bros Car Sales | 112 | €29k | 78 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 4 serious accessibility failures; 78 Google reviews not shown | [card](cards/limerick.md#d--l-oconnell-bros-car-sales-tournafulla-newcastle-west--tier-b-60100) |
| 78 | B | 57 | Waterford | Cullinane Williams Car Sales | 109 | €22k | 115 | CarsIreland.ie (footer: 'Powered by CarsIreland.ie') | 3 serious accessibility failures; 115 Google reviews not shown | [card](cards/waterford.md#cullinane-williams-car-sales-waterford-city-cork-road--tier-b-60100-able-37-willing-14-opening-9) |
| 79 | B | 57 | Waterford | Azkar | 152 | €27k | 170 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 4 script errors; 5 serious accessibility failures; 170 Google reviews not shown | [card](cards/waterford.md#azkar-waterford--tier-b-60100-able-37-willing-11-opening-12) |
| 80 | B | 56 | Cork | John Dunne Motors | 96 | €13k | 143 | CarsIreland.ie | 6 script errors; 3 serious accessibility failures; 143 Google reviews not shown | [card](cards/cork.md#john-dunne-motors-turners-cross-cork-city--tier-b-59100) |
| 81 | B | 56 | Cork | Greenhall Motors | 56 | €38k |  | no credit shown (Next.js site) | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/cork.md#greenhall-motors-buttevant--tier-b-56100) |
| 82 | B | 56 | Kerry | DC Autoline Kerry | 79 | €13k |  | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | site answers 429; not built for phones (no viewport); 1 script errors | [card](cards/kerry.md#dc-autoline-kerry-tralee--tier-b-59100-able-28-willing-7-opening-24) |
| 83 | B | 56 | Limerick | Dan Dooley Ford Centre | 54 | €18k | 107 | HappyDealer (footer 'Website by HappyDealer') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/limerick.md#dan-dooley-ford-centre-knocklong--tier-b-56100) |
| 84 | B | 55 | Kerry | Listowel Auto's Ltd | 78 | €25k | 142 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 10 script errors; 3 serious accessibility failures; 142 Google reviews not shown | [card](cards/kerry.md#listowel-autos-ltd-listowel--tier-b-58100-able-32-willing-11-opening-15) |
| 85 | B | 54 | Cork | Jimmy Barry Motors | 68 | €20k | 77 | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | site did not load (page.goto: Timeout 30000ms exceeded.) | [card](cards/cork.md#jimmy-barry-motors-bantry--tier-b-54100) |
| 86 | B | 54 | Galway | Oliver Geoghegan Car Sales | 90 | €16k | 375 | CarsIreland (footer 'Powered by CarsIreland.ie') | 6 script errors; 5 serious accessibility failures | [card](cards/galway.md#oliver-geoghegan-car-sales-ardrahan--tier-b-57100) |
| 87 | B | 54 | Kerry | Walsh Autos | 78 | €17k | 168 | CarsIreland (footer: Powered by CarsIreland.ie) | 6 script errors; 3 serious accessibility failures; no trade-in on the home page | [card](cards/kerry.md#walsh-autos-castleisland--tier-b-57100-able-28-willing-14-opening-15) |
| 88 | B | 54 | Kerry | Auto Polo Group Irl | 55 | €11k |  | none (no own website) | no website found | [card](cards/kerry.md#auto-polo-group-irl-tralee--tier-b-54100-able-28-willing-2-opening-24) |
| 89 | B | 54 | Waterford | Martin Barrett Car Sales | 57 | €20k | 93 | HappyDealer (footer 'website by happydealer.ie') | 1 script errors; 6 serious accessibility failures; no trade-in on the home page | [card](cards/waterford.md#martin-barrett-car-sales-waterford-city-catherine-street--tier-b-54100-able-28-willing-14-opening-12) |
| 90 | B | 54 | Waterford | Anthony Duggan Car Sales | 71 | €21k | 51 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 19 script errors; 3 serious accessibility failures; 51 Google reviews not shown | [card](cards/waterford.md#anthony-duggan-car-sales-dungarvan--tier-b-57100-able-28-willing-14-opening-15) |
| 91 | B | 54 | Waterford | Castletown Car Sales | 49 | €15k | 75 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 4 script errors; 3 serious accessibility failures; 75 Google reviews not shown | [card](cards/waterford.md#castletown-car-sales-tramore--tier-b-57100-able-28-willing-14-opening-15) |
| 92 | B | 53 | Waterford | Alan Galibert Car Sales | 90 | €15k | 95 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 5 script errors; 6 serious accessibility failures; no trade-in on the home page | [card](cards/waterford.md#alan-galibert-car-sales-waterford--tier-b-56100-able-33-willing-11-opening-12) |
| 93 | B | 52 | Cork | Abernethys | 43 | €19k |  | Ford Ireland dealer template (manufacturer platform) | 3 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/cork.md#abernethys-midleton--tier-b-52100) |
| 94 | B | 52 | Galway | Sean Fleming Motors | 64 | €40k | 126 | HappyDealer (footer 'Website by HappyDealer') | 1 script errors; 7 serious accessibility failures; no WhatsApp | [card](cards/galway.md#sean-fleming-motors-oranmore--tier-b-52100) |
| 95 | B | 52 | Galway | Aaamber Motors Ltd | 59 | €14k | 243 | HappyDealer (footer 'Website by HappyDealer') | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/galway.md#aaamber-motors-ltd-galway-tuam-road--tier-b-52100) |
| 96 | B | 52 | Galway | TK Car Sales (TK Cars) | 57 | €23k | 458 | Not credited in footer | 1 script errors; 7 serious accessibility failures; no WhatsApp | [card](cards/galway.md#tk-car-sales-tk-cars-oranmore--tier-b-52100) |
| 97 | B | 52 | Limerick | Pierse Select | 48 | €29k |  | HappyDealer (footer 'website by happydealer.ie') | 1 script errors; 7 serious accessibility failures; no trade-in on the home page | [card](cards/limerick.md#pierse-select-limerick--tier-b-52100) |
| 98 | B | 52 | Waterford | Premium Autos | 71 | €14k | 326 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 5 script errors; 6 serious accessibility failures | [card](cards/waterford.md#premium-autos-waterford-city-cork-road--tier-b-55100-able-28-willing-18-opening-9) |
| 99 | B | 52 | Waterford | Waterford Motor Village | 24 | €13k | 99 |  | 1 serious accessibility failures; no enquiry form on the home page; no finance on the home page | [card](cards/waterford.md#waterford-motor-village-waterford-city-waterford-business-park--tier-b-52100-able-25-willing-9-opening-18) |
| 100 | B | 51 | Cork | Roskeen Cars & Commercials | 65 | €15k | 106 | CarsIreland.ie | 4 script errors; 6 serious accessibility failures; no trade-in on the home page | [card](cards/cork.md#roskeen-cars--commercials-lombardstown--tier-b-54100) |
| 101 | B | 51 | Cork | Ballincollig Motors | 62 | €15k | 111 | CarsIreland.ie | 6 script errors; 3 serious accessibility failures; 111 Google reviews not shown | [card](cards/cork.md#ballincollig-motors-ballincollig--tier-b-54100) |
| 102 | B | 51 | Cork | Ollie Kierce Cars | 41 | €16k | 104 | HappyDealer | 2 script errors; 5 serious accessibility failures; no WhatsApp | [card](cards/cork.md#ollie-kierce-cars-carrigtwohill--tier-b-51100) |
| 103 | B | 51 | Cork | Macroom Motors (Toyota) | 98 |  |  | Toyota Ireland dealer platform | 4 script errors; 3 serious accessibility failures; no WhatsApp | [card](cards/cork.md#macroom-motors-toyota-macroom--tier-b-54100) |
| 104 | B | 51 | Galway | Elite Autos | 125 | €16k | 108 | CarsIreland (footer 'Powered by' CarsIreland) | 6 serious accessibility failures | [card](cards/galway.md#elite-autos-headford--tier-b-54100) |
| 105 | B | 51 | Kerry | JPS Car Sales | 68 | €15k | 120 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 19 script errors; 3 serious accessibility failures; 120 Google reviews not shown | [card](cards/kerry.md#jps-car-sales-killarney-fossa--tier-b-54100-able-28-willing-11-opening-15) |
| 106 | B | 51 | Kerry | Motorcare Cars & Customising | 46 | €18k | 130 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 18 script errors; 4 serious accessibility failures; 130 Google reviews not shown | [card](cards/kerry.md#motorcare-cars--customising-listowel--tier-b-54100-able-28-willing-11-opening-15) |
| 107 | B | 51 | Waterford | MD Cars | 66 | €18k | 62 | HappyDealer (footer: 'Website by HappyDealer') | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp | [card](cards/waterford.md#md-cars-dungarvan--tier-b-51100-able-28-willing-14-opening-9) |
| 108 | B | 50 | Cork | Top Spec Motors | 281 | €23k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 3 serious accessibility failures | [card](cards/cork.md#top-spec-motors-newmarket--tier-b-53100) |
| 109 | B | 50 | Galway | MPS Garage Ltd | 33 | €18k | 182 | Likely Wix (images on Wix static host; inferred, no footer credit seen) | 2 serious accessibility failures; sends buyers to DoneDeal or CarsIreland; no enquiry form on the home page | [card](cards/galway.md#mps-garage-ltd-galway-tuam-road--tier-b-50100) |
| 110 | B | 50 | Kerry | RH Car Sales | 40 | €8k |  | none (no own website) | no website found | [card](cards/kerry.md#rh-car-sales-tralee--tier-b-50100-able-24-willing-2-opening-24) |
| 111 | B | 50 | Limerick | Thomas Motors | 46 | €12k | 29 | none (no own website) | no website found | [card](cards/limerick.md#thomas-motors-newcastle-west--tier-b-50100) |
| 112 | B | 50 | Waterford | Kieran Sandford Motors | 42 | €8k | 62 | Square1 ('Developed by Square1', powered by DoneDeal) | 22 script errors; 3 serious accessibility failures; 62 Google reviews not shown | [card](cards/waterford.md#kieran-sandford-motors-dungarvan--tier-b-53100-able-24-willing-14-opening-15) |
| 113 | C | 76 | Kerry | Audi Approved :plus Kerry | 94 | €40k | 89 | Custom WordPress site (no builder credit), sister site to Audi Cork | Tier set by hand: Run centrally by Blackwater Motors (Cork): its footer reads 'About Blackwater Motors'. Pitch it through Blackwater, not on its own. |  |
| 114 | C | 64 | Limerick | Leonards Motors | 112 | €46k | 210 | Not shown | Tier set by hand: Modern site with finance, part exchange, reviews and WhatsApp: little to sell. |  |
| 115 | C | 56 | Waterford | H&H Motors | 77 |  |  | NetDirector by Keyloop (footer credit) | Tier set by hand: Its site already has a 77-car search and shows 309 reviews at 4.5: little to sell. |  |
| 116 | C | 53 | Limerick | Rhino Auto Sales | 68 | €6k | 90 | WordPress (footer 'Powered by WordPress') | Tier set by hand: About €0.4m of stock (typical car about €5,700) on a brochure site with a Gmail address: unlikely to pay. |  |
| 117 | C | 52 | Galway | Traynors Garage | 27 | €53k | 63 | CarsIreland (footer: Powered by CarsIreland) | Tier set by hand: Site already has test drive, finance, valuation, WhatsApp and van prices plus VAT: only a one-inbox pitch. |  |
| 118 | C | 49 | Cork | Denis & Mary Ryan | 37 | €17k | 133 | CarsIreland.ie | 12 script errors; 6 serious accessibility failures |  |
| 119 | C | 49 | Cork | D Canny Garage | 46 | €24k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 script errors; 6 serious accessibility failures |  |
| 120 | C | 49 | Cork | Fermoy Nissan | 45 | €23k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 script errors; 6 serious accessibility failures |  |
| 121 | C | 49 | Cork | O'Briens Garage Midleton | 39 | €33k | 191 | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 script errors; 6 serious accessibility failures; no WhatsApp |  |
| 122 | C | 49 | Galway | AutoCollection Prestige Cars | 43 | €40k | 61 | HappyDealer (footer 'Website by HappyDealer') | 7 serious accessibility failures; no WhatsApp |  |
| 123 | C | 48 | Cork | Fogarty Bros | 23 | €39k |  | CarsIreland.ie | 10 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 124 | C | 48 | Galway | Kieran Moran Car & Commercial Sales | 59 | €17k | 151 | HappyDealer (footer 'Website by HappyDealer') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp |  |
| 125 | C | 48 | Galway | Oliver Walsh Auto | 32 | €29k | 211 | HappyDealer (footer 'Website by HappyDealer') | 1 script errors; 7 serious accessibility failures; no trade-in on the home page |  |
| 126 | C | 48 | Limerick | CMC Car Sales | 41 | €29k | 125 | CarsIreland (footer: Powered by CarsIreland) | 6 serious accessibility failures; 125 Google reviews not shown |  |
| 127 | C | 48 | Limerick | 547 Motors | 32 | €19k |  | HappyDealer (footer: Website by HappyDealer) | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp |  |
| 128 | C | 47 | Kerry | Jerry O'Sullivan Car Sales Ltd | 26 | €17k | 75 | none | no website of its own |  |
| 129 | C | 47 | Limerick | Gammell Car Sales | 45 | €11k | 77 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 10 script errors; 3 serious accessibility failures; 77 Google reviews not shown |  |
| 130 | C | 47 | Waterford | Grand Motors | 22 | €10k | 69 | none (no own website) | no website found |  |
| 131 | C | 46 | Galway | John Kelleher Salthill Ltd. | 33 | €28k | 72 | CarsIreland (footer: Powered by CarsIreland) | Tier set by hand: Site already has test drive, valuation, service request, WhatsApp and reviews: only a one-inbox pitch. |  |
| 132 | C | 46 | Galway | Forde Motors | 60 | €12k | 78 |  | 9 script errors; 2 serious accessibility failures; sends buyers to DoneDeal or CarsIreland |  |
| 133 | C | 46 | Kerry | Joe O'Connor Car Sales | 85 | €17k | 17 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 10 script errors; 3 serious accessibility failures |  |
| 134 | C | 45 | Cork | Rigney Bros | 33 |  | 104 | CarsIreland.ie | 6 script errors; 4 serious accessibility failures; no trade-in on the home page |  |
| 135 | C | 45 | Cork | Blackpool Auto Centre | 45 | €16k | 108 | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 serious accessibility failures; no WhatsApp |  |
| 136 | C | 45 | Cork | Kellehers of Macroom | 23 | €41k |  | Ford Ireland dealer template (manufacturer platform) | 3 serious accessibility failures; no trade-in on the home page; no WhatsApp |  |
| 137 | C | 45 | Galway | M17 Motors | 79 | €19k | 118 | CarsIreland (footer 'Powered by' CarsIreland) | 6 script errors; 6 serious accessibility failures |  |
| 138 | C | 45 | Galway | Mellotte Motors | 69 | €16k | 133 | CarsIreland (footer 'Powered by' CarsIreland) | 4 script errors; 6 serious accessibility failures |  |
| 139 | C | 45 | Waterford | Noel O'Keeffe Auto Developments | 21 | €19k | 17 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | site answers 429; not built for phones (no viewport); 1 script errors |  |
| 140 | C | 44 | Cork | Clonakilty Car Centre | 68 | €10k |  | HappyDealer ('Website by HappyDealer') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp |  |
| 141 | C | 44 | Cork | Deerpark Motors Ltd | 26 | €16k |  | HappyDealer ('Website by HappyDealer') | 2 script errors; 7 serious accessibility failures; no trade-in on the home page |  |
| 142 | C | 44 | Kerry | Des Murphy Cars Ltd | 64 | €19k | 48 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 13 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 143 | C | 44 | Limerick | PJ's Garage & Car Sales | 27 | €9k | 509 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 4 serious accessibility failures; 509 Google reviews not shown |  |
| 144 | C | 44 | Waterford | Eddie Garry Cars | 73 | €7k | 80 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 7 script errors; 6 serious accessibility failures |  |
| 145 | C | 44 | Waterford | Dungarvan Motor Mall | 37 | €17k | 133 | HappyDealer (footer 'website by happydealer.ie') | 1 script errors; 7 serious accessibility failures; no WhatsApp |  |
| 146 | C | 43 | Galway | Costello Motors (Galway) Ltd | 32 | €16k | 52 | CarsIreland (footer 'Powered by' CarsIreland logo) | site did not load (page.goto: Timeout 30000ms exceeded.) |  |
| 147 | C | 43 | Kerry | DOS Motors | 24 | €9k |  | none (no own website) | no website found |  |
| 148 | C | 43 | Kerry | Mike O'Sullivan Car Sales Ltd | 23 | €12k |  | none (no own website) | no website found |  |
| 149 | C | 43 | Limerick | Damian McElligott Motors | 29 | €14k | 12 | none (no own website) | no website found |  |
| 150 | C | 43 | Limerick | Jeff Deegan Motors | 25 | €11k | 41 | none (no own website) | no website found |  |
| 151 | C | 43 | Limerick | Johnny Gayer Auto Sales | 23 | €15k |  | none (no own website) | no website found |  |
| 152 | C | 43 | Limerick | Graham Car Sales | 20 | €11k |  | None working: domain serves a casino spam page | no website found |  |
| 153 | C | 43 | Waterford | Car Clinic | 21 | €12k | 88 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 22 script errors; 5 serious accessibility failures; 88 Google reviews not shown |  |
| 154 | C | 42 | Cork | E. Tarrant & Sons Ltd | 39 | €34k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 8 script errors; 6 serious accessibility failures |  |
| 155 | C | 42 | Cork | Denis Cullinane Car Sales | 35 | €36k | 213 | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 4 serious accessibility failures |  |
| 156 | C | 42 | Galway | Fred Kilmartin Ltd | 37 | €18k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 6 serious accessibility failures |  |
| 157 | C | 42 | Kerry | Dillon Car Sales | 55 |  | 27 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 3 serious accessibility failures |  |
| 158 | C | 41 | Cork | Jonathan O'Brien Cars | 70 | €40k |  | HappyDealer | 7 serious accessibility failures; no WhatsApp |  |
| 159 | C | 41 | Cork | David Tobin Cars | 34 | €15k | 297 | HappyDealer | 8 serious accessibility failures; no WhatsApp |  |
| 160 | C | 41 | Cork | James Dunlea Car Sales | 33 | €18k | 109 | CarsIreland.ie | 6 script errors; 4 serious accessibility failures |  |
| 161 | C | 41 | Cork | Eds Car Sales Fermoy | 27 | €32k | 130 | Webador (jwwb.nl assets) | 2 script errors; 1 serious accessibility failures |  |
| 162 | C | 41 | Cork | Midleton MotorStore | 78 | €12k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 4 serious accessibility failures |  |
| 163 | C | 41 | Cork | McNamara Motors | 67 | €15k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 4 serious accessibility failures |  |
| 164 | C | 41 | Cork | CBC Motors | 58 | €25k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 3 serious accessibility failures |  |
| 165 | C | 41 | Cork | H & H Autos | 39 | €42k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 166 | C | 41 | Galway | Motor World | 38 | €54k |  | HappyDealer (footer 'Website by HappyDealer') | 7 serious accessibility failures; no trade-in on the home page; no WhatsApp |  |
| 167 | C | 41 | Galway | Galway Cars | 27 | €43k | 58 | Car Dealer 5 (footer 'Powered by Car Dealer 5', UK platform) | 5 script errors; 5 serious accessibility failures; no WhatsApp |  |
| 168 | C | 41 | Galway | H West Motors | 36 | €24k | 94 | CarsIreland.ie dealer website (footer: Powered by CarsIreland.ie) | 6 script errors; 4 serious accessibility failures |  |
| 169 | C | 41 | Kerry | Killorglin Autos Ltd | 16 | €13k | 109 | none (no own website) | no website found |  |
| 170 | C | 41 | Limerick | DG Autos | 43 | €12k | 77 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 4 script errors; 4 serious accessibility failures |  |
| 171 | C | 41 | Limerick | Killaloe Auto Sales Limited | 49 | €18k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 3 serious accessibility failures |  |
| 172 | C | 40 | Cork | Mac's Motors | 54 | €9k |  | CarsIreland.ie | 6 script errors; 4 serious accessibility failures |  |
| 173 | C | 40 | Cork | Ryan Motors (Pat & Jason Ryan Motors) | 38 | €19k |  | HappyDealer | 1 script errors; 6 serious accessibility failures; no trade-in on the home page |  |
| 174 | C | 40 | Cork | O'Leary's Lissarda | 33 | €26k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 script errors; 6 serious accessibility failures; no trade-in on the home page |  |
| 175 | C | 40 | Kerry | Colm Cronin Car Sales Ltd | 16 | €11k |  | none | no website of its own |  |
| 176 | C | 40 | Kerry | Cunningham Motors | 22 | €20k | 53 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 9 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 177 | C | 40 | Limerick | Auto Trade Depot | 16 | €8k |  | none | no website of its own |  |
| 178 | C | 40 | Waterford | MonRo Motors Ltd | 24 | €9k | 161 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 18 script errors; 3 serious accessibility failures; 161 Google reviews not shown |  |
| 179 | C | 39 | Cork | Linehan Car Sales Millstreet | 23 | €12k | 49 | Google Sites (self-built) | 5 script errors; no enquiry form on the home page; no trade-in on the home page |  |
| 180 | C | 39 | Kerry | Moriartys Central Car Sales | 22 | €17k | 21 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | site did not load (page.goto: Timeout 30000ms exceeded.) |  |
| 181 | C | 39 | Waterford | PM Autos | 28 | €18k |  | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | site did not load (page.goto: Timeout 30000ms exceeded.) |  |
| 182 | C | 38 | Galway | GE Motors | 30 | €17k | 89 | Not shown | 9 script errors; 1 serious accessibility failures; sends buyers to DoneDeal or CarsIreland |  |
| 183 | C | 38 | Galway | Clear Lux Auto Ltd | 25 | €11k | 62 |  | 3 script errors; 3 serious accessibility failures; no enquiry form on the home page |  |
| 184 | C | 38 | Kerry | Killarney Auto's Ltd | 21 | €45k | 90 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 4 serious accessibility failures |  |
| 185 | C | 38 | Limerick | Lowes Car Sales | 21 |  |  | CarsIreland (footer: Powered by CarsIreland.ie) | 10 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 186 | C | 38 | Limerick | Kyleford Motors | 21 |  |  | none | no website found |  |
| 187 | C | 37 | Cork | Kiely's of Mallow | 39 | €17k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 8 script errors; 4 serious accessibility failures; no WhatsApp |  |
| 188 | C | 37 | Cork | Ben Henry Motors | 28 | €26k |  | HappyDealer ('Website by HappyDealer') | 6 serious accessibility failures; no trade-in on the home page; no WhatsApp |  |
| 189 | C | 37 | Cork | Excellent Auto Choice | 28 | €30k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 7 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 190 | C | 37 | Cork | Eoin Dooley Cars | 15 | €12k |  | none (no website listed on CarsIreland) | no website found |  |
| 191 | C | 37 | Galway | Autowest Motors | 22 | €17k | 96 | WordPress, footer 'powered by MangoTech Solutions' | 3 script errors; 4 serious accessibility failures |  |
| 192 | C | 37 | Galway | Glenn Cahill Cars | 17 | €25k | 113 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 193 | C | 37 | Galway | RF Car Sales Ltd | 15 | €12k |  | none | no website of its own |  |
| 194 | C | 37 | Kerry | Michael Daffy Car Sales | 61 | €9k | 38 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 4 serious accessibility failures |  |
| 195 | C | 37 | Kerry | Trader Kerry | 19 | €7k |  | none (no own website) | no website found |  |
| 196 | C | 37 | Kerry | Mangan Bros Garage | 18 | €16k | 13 | none (no own website) | no website found |  |
| 197 | C | 37 | Kerry | Murphy Motors | 15 | €9k | 4 | none (no own website) | no website found |  |
| 198 | C | 37 | Limerick | Adare Motors | 17 | €7k |  | none (no own website) | no website found |  |
| 199 | C | 37 | Limerick | Mark O Donnell Cars | 16 | €6k |  | none (no own website) | no website found |  |
| 200 | C | 37 | Limerick | RS Autotrade | 15 | €7k |  | none (no own website) | no website found |  |
| 201 | C | 37 | Limerick | Treaty City Car Sales | 15 | €7k |  | none (no own website) | no website found |  |
| 202 | C | 37 | Limerick | Gibbons Autos LTD | 17 | €8k |  | none (no website listed on CarsIreland) | no website found |  |
| 203 | C | 37 | Waterford | Sean Kennedy Motors | 18 | €7k |  | none (no own website) | no website found |  |
| 204 | C | 37 | Waterford | Haley Car Sales Ltd | 16 | €7k |  | none (no own website) | no website found |  |
| 205 | C | 37 | Waterford | John Foley Auto Sales | 15 | €10k | 36 | none (no own website) | no website found |  |
| 206 | C | 36 | Cork | Granville Motors Cork | 34 | €15k | 33 | CarsIreland.ie | 7 script errors; 3 serious accessibility failures; no WhatsApp |  |
| 207 | C | 36 | Waterford | Sweep Garage | 20 | €20k |  | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 208 | C | 34 | Cork | Direct Motors.ie | 35 | €26k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 script errors; 6 serious accessibility failures |  |
| 209 | C | 34 | Galway | Cosgroves Garage | 18 | €39k |  | WordPress theme (ThemeMakers), no agency credit | 4 script errors; 5 serious accessibility failures; no trade-in on the home page |  |
| 210 | C | 34 | Kerry | Randles Motors Kerry | 28 |  | 34 | Unknown: 'powered by' image unnamed; assets load from a liberatingsolution.tech design-demo path | 1 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 211 | C | 34 | Limerick | JVC Motors | 16 | €17k | 72 | Custom Next.js site (no builder credit) | 2 serious accessibility failures; no finance on the home page; no trade-in on the home page |  |
| 212 | C | 33 | Cork | Airport Road Car Sales | 30 | €8k |  | CarsIreland.ie | 6 script errors; 3 serious accessibility failures |  |
| 213 | C | 33 | Cork | OC Motors | 27 | €13k | 28 | CarsIreland.ie | 6 script errors; 4 serious accessibility failures |  |
| 214 | C | 33 | Cork | Diarmuid French Motors | 26 | €9k |  | CarsIreland.ie | 6 script errors; 3 serious accessibility failures |  |
| 215 | C | 33 | Cork | ASM Auto Sales Macroom Ltd | 22 | €13k | 37 | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 script errors; 4 serious accessibility failures; no trade-in on the home page |  |
| 216 | C | 33 | Galway | Barrett Motors | 32 | €14k | 38 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 5 serious accessibility failures; no WhatsApp |  |
| 217 | C | 33 | Galway | Galway Car Sales.ie | 30 | €12k |  | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 21 script errors; 3 serious accessibility failures; no WhatsApp |  |
| 218 | C | 33 | Galway | Gary Giles Cars | 26 | €23k | 48 | DoneDeal dealer website, developed by Square1 (footer credit) | 15 script errors; 4 serious accessibility failures; no WhatsApp |  |
| 219 | C | 33 | Galway | Nohilly's Autos | 24 | €9k | 22 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 25 script errors; 4 serious accessibility failures |  |
| 220 | C | 33 | Galway | Shiel Motors Ltd | 38 | €8k |  | CarsIreland.ie dealer website (footer: Powered by CarsIreland.ie) | 6 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 221 | C | 33 | Kerry | John White Car Sales Ltd | 27 | €17k | 21 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 14 script errors; 3 serious accessibility failures; no WhatsApp |  |
| 222 | C | 33 | Kerry | Tubrid Motors Ltd | 15 | €17k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | site did not load (page.goto: Timeout 30000ms exceeded.) |  |
| 223 | C | 33 | Limerick | DK Autosales | 27 | €19k | 22 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 4 script errors; 6 serious accessibility failures; no trade-in on the home page |  |
| 224 | C | 33 | Limerick | Horgan's Garage | 20 | €12k |  | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 9 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 225 | C | 32 | Galway | VP MOTORS | 16 |  |  | none | no website found |  |
| 226 | C | 31 | Cork | Cavanaghs of Fermoy |  |  |  |  | site did not load (page.goto: net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH at https://www.cavanaghsoffermoyford.ie/) |  |
| 227 | C | 31 | Galway | Heritage Motors Ltd Galway | 16 | €18k | 58 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 4 script errors; 4 serious accessibility failures; 58 Google reviews not shown |  |
| 228 | C | 30 | Cork | Cadogan Motor Works | 17 | €25k |  | CarsIreland.ie | 6 script errors; 4 serious accessibility failures; no WhatsApp |  |
| 229 | C | 30 | Cork | Blackrock Motor Company | 34 | €12k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 4 serious accessibility failures |  |
| 230 | C | 30 | Cork | SB Motors | 30 | €14k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 6 serious accessibility failures |  |
| 231 | C | 30 | Cork | CH Car Source | 21 | €8k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 3 serious accessibility failures |  |
| 232 | C | 30 | Galway | Noel Turley Autosales | 30 | €8k | 18 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 3 serious accessibility failures |  |
| 233 | C | 30 | Kerry | Mulvihill Motors | 30 | €11k | 22 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 22 script errors; 5 serious accessibility failures |  |
| 234 | C | 30 | Limerick | Autocamp LTD | 25 | €9k | 25 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 3 serious accessibility failures |  |
| 235 | C | 30 | Waterford | David Power Motors | 20 | €15k | 33 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 5 script errors; 4 serious accessibility failures |  |
| 236 | C | 30 | Waterford | Blaa Cars | 18 | €32k | 17 | HappyDealer (footer 'website by happydealer.ie') | 1 script errors; 8 serious accessibility failures; no trade-in on the home page |  |
| 237 | C | 29 | Limerick | Donie Daffy Car Sales | 15 |  |  | CarsIreland (footer: Powered by CarsIreland.ie) | 10 script errors; 4 serious accessibility failures |  |
| 238 | C | 29 | Waterford | Simon Kavanagh Motors Waterford | 15 | €28k | 16 | HappyDealer (footer 'website by happydealer.ie') | 6 serious accessibility failures; no WhatsApp |  |
| 239 | C | 27 | Cork | Assured Autos | 19 | €30k |  | DoneDeal dealer website ('Powered by DoneDeal, Developed by Square1') | 14 script errors; 4 serious accessibility failures; no WhatsApp |  |
| 240 | C | 27 | Cork | Blue Diamond Cars | 18 | €14k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 4 serious accessibility failures; no WhatsApp |  |
| 241 | C | 27 | Galway | Legacy Motors | 17 | €13k | 10 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 21 script errors; 4 serious accessibility failures |  |
| 242 | C | 27 | Galway | Eve Autos | 15 | €32k | 35 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 4 serious accessibility failures |  |
| 243 | C | 27 | Galway | Castle View Motors | 17 | €6k |  | Wix | sends buyers to DoneDeal or CarsIreland; no finance on the home page; no trade-in on the home page |  |
| 244 | C | 27 | Galway | Kylemore Service Station | 16 | €8k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 3 serious accessibility failures; no trade-in on the home page |  |
| 245 | C | 27 | Waterford | McConnell Bros | 16 | €20k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 6 serious accessibility failures; no WhatsApp |  |
| 246 | C | 25 | Waterford | Hornibrooks of Lismore | 18 |  |  | HappyDealer (footer: happydealer.ie) | 1 script errors; 7 serious accessibility failures; no WhatsApp |  |
| 247 | C | 24 | Cork | Proline Motors | 16 | €17k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 4 script errors; 4 serious accessibility failures |  |
| 248 | C | 24 | Cork | SuroCars.ie | 15 | €20k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 4 serious accessibility failures |  |
| 249 | C | 24 | Kerry | Healy Automotive | 16 | €12k | 35 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 20 script errors; 4 serious accessibility failures |  |
| 250 | C | 24 | Kerry | Neziri Motors | 19 | €9k | 37 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 1 script errors; 5 serious accessibility failures |  |
| 251 | C | 24 | Limerick | Healys Garage | 18 | €14k | 43 | CarsIreland dealer site (footer 'Powered by CarsIreland.ie') | 6 script errors; 3 serious accessibility failures |  |
| 252 | C | 24 | Limerick | AutoSpace Ireland | 16 | €12k | 8 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 20 script errors; 3 serious accessibility failures |  |
| 253 | C | 24 | Limerick | JN Car Sales | 15 | €17k | 13 | DoneDeal dealer website (footer 'Powered by DoneDeal', developed by Square1) | 9 script errors; 4 serious accessibility failures |  |
| 254 | C | 24 | Waterford | M & B Motors Waterford | 16 | €10k |  | CarsIreland dealer website template (WordPress, 'Powered by CarsIreland') | 6 script errors; 3 serious accessibility failures |  |
| 255 | C | 22 | Cork | Paddy Shanahan Cars Cork | 19 | €9k |  |  | 10 script errors; 3 serious accessibility failures; no WhatsApp |  |

## Skipped
| County | Dealer | Why |
|---|---|---|
| Cork | Kearys Motor Group (incl. Kearys CarStore) | National group with one central site (CarStore in Dublin, Cork, Limerick, Galway; built by mtc). |
| Cork | MSL Mercedes-Benz Cork | Part of MSL Motor Group (Dublin HQ, Dublin and Cork branches) on one central site. |
| Cork | ZuCar Cork | Part of the Joe Duffy Group (national) with one central ZuCar site. |
| Cork | Midleton Motors | 13 cars for sale. |
| Cork | Clarke Bros (Bandon) | 14 cars for sale. |
| Cork | Carrigaline Car Sales | 12 to 14 cars for sale (own site 12, DoneDeal 14). |
| Cork | Martin Burke Car Sales | 13 cars for sale. |
| Cork | Cronin Autos | 11 to 12 cars for sale (own site 11, DoneDeal 12). |
| Cork | John O'Brien Car Sales | 6 cars for sale. |
| Cork | Kelleher Motors | 7 ads (4 cars, 3 commercials). |
| Cork | Cork Truck Services / Dennehy Trucks & Vans / Neil Mc Auliffe | Not car retailers: trucks, vans or campervans only. |
| Cork | Kinsale Road Autos | No cars for sale on DoneDeal (0 ads). |
| Cork | Hertz Car Sales Cork (and Blarney) | Rental brand's ex-fleet outlet (also Hertz Car Sales Blarney, 24 cars), not a dealer prospect. |
| Galway | Lyons of Galway | Only 9 cars listed, and the Galway branch of the Limerick-based Lyons Motor Group. |
| Galway | Kearys Carstore Galway | Branch of Kearys CarStore, a national group (Dublin, Cork, Limerick, Galway on cars.ie) with one central site. |
| Galway | Windsor MotorMall Galway | Branch of Windsor, a national motor group whose sites are run centrally. |
| Galway | Steede Motor Group | Only 14 cars listed on cars.ie. |
| Galway | Castle Motors Athenry | Only 11 cars listed on cars.ie. |
| Galway | DC Motors | Only 11 cars listed on cars.ie. But its DoneDeal page shows 21 ads (2026-11-20) across cars, commercials, trailers and tractors, mostly under €9k; car count unclear. |
| Galway | Gerard Lyons Garage | Only 11 cars listed on cars.ie. |
| Galway | Whyte Autos | Only 10 cars listed on cars.ie. |
| Galway | Tom Raftery Car Sales | Only 9 cars listed on cars.ie. |
| Galway | Waterview Autos | Only 9 cars listed on cars.ie. |
| Galway | A-1 VEHICLE SALES & SERVICES | Only 7 cars listed on cars.ie. |
| Galway | Ken Horan Motors | Only 7 cars listed on cars.ie. |
| Galway | MH Motors | Only 6 cars listed on cars.ie. |
| Galway | Prodrive Motors | Only 6 cars listed on cars.ie. |
| Galway | 4x4 & Car Sales | Only 5 cars listed on cars.ie. |
| Galway | Autotek | Only 5 cars listed on cars.ie. |
| Galway | Direct Autos Galway | Only 5 cars listed on cars.ie. |
| Galway | Conway Car Sales | Only 4 cars listed on cars.ie. |
| Galway | Eco Cars | Only 3 cars listed on cars.ie. |
| Galway | Jph Motors Ltd | Only 3 cars listed on cars.ie. |
| Galway | McCormacks Car Sales | Only 2 cars listed on cars.ie. |
| Galway | Absolute Cars | Only 1 cars listed on cars.ie. |
| Galway | Finnerty Sales | Only 1 cars listed on cars.ie. |
| Galway | Mahons Garage | Only 1 cars listed on cars.ie. |
| Galway | Paul Regan Car Sales | Only 1 cars listed on cars.ie. |
| Galway | R M Commercials | Only 1 cars listed on cars.ie. |
| Galway | Van Monster Galway | Only 1 cars listed on cars.ie. Vans specialist, part of national Van Monster chain. |
| Limerick | Kearys CarStore Limerick | National group (Kearys Motor Group): one carstore.ie site for Dublin, Cork, Limerick, Galway. |
| Limerick | Sheils Motor Group Limerick | Group run from Ennis, Co. Clare: one sheils.ie site for Galway, Ennis, Limerick (site by CRD Media). Limerick branch had 43 DoneDeal ads, 147 Google reviews 4.5. |
| Limerick | Conlans BMW Limerick | Branch of a Kildare-based BMW/MINI group on one conlans.ie site (site blocked us, 403). Limerick DoneDeal pages now show 66 cars (conlans-limerick-bmw) plus 16 (conlans-collection-limerick), 846 Google reviews 4.7. |
| Limerick | Audi Limerick | Reported part of Joe Duffy Motor Group (national group; older article, not re-verified); site returned 503. Confirmed 2026-11-20: its DoneDeal page (91 ads) links to joeduffy.ie/audi. |
| Limerick | Europcar Car Sales Limerick | Rental company's ex-fleet sales outlet. |
| Limerick | Hertz Car Sales Limerick | Rental brand outlet with 0 ads on DoneDeal. |
| Limerick | Moloneys of Abbeyfeale | 13 ads, mostly vans (406 Google reviews 4.4). Confirmed 2026-11-20: 13 on DoneDeal; site moloneysgarage.ie listed there. |
| Limerick | Davin Car Sales | 12 ads. |
| Limerick | Mike Cosgrave Car Sales | 11 ads, low-priced, includes a digger and a transport service. Now 11 results on DoneDeal (2026-11-20). |
| Limerick | MK Auto Sales | 9 ads, 7 of them campers. |
| Limerick | Castle Motors NCW | About 9 cars in stock. |
| Limerick | TMG Car Sales Limerick | 3 ads on its DoneDeal dealer page (2026-11-20). |
| Limerick | Newcastle West Autos | No sign of current trading: website domain no longer resolves, no DoneDeal page found. Rechecked 2026-11-20: domain still does not resolve and not in DoneDeal's Limerick dealer directory (105 dealers). |
| Limerick | Michael Flynn Cars (Newcastle West) | No sign of current trading: Limerick website no longer resolves, nothing else found. Branch of a Longford dealer. Rechecked 2026-11-20: domain still does not resolve and not in DoneDeal's Limerick dealer directory (105 dealers). |
| Limerick | Arthur Auto Sales | No sign of current trading: website domain no longer resolves, no DoneDeal page found; only a 2022 guide and an old sponsored article. Rechecked 2026-11-20: domain still does not resolve and not in DoneDeal's Limerick dealer directory (105 dealers). |
| Limerick | Singland Motors | Mainly a Land Rover service centre; no stock found online. DoneDeal page exists with 0 ads (2026-11-20). |
| Limerick | ZuCar Limerick | ZuCar brand site (zucar.ie, built by UK agency mtc.) already has stock search, finance, valuation and leasing, with a Locations page: a multi-site brand run centrally on a modern site. |
| Waterford | Tom Dale Car Sales | No sign of trading found online beyond an old Golden Pages entry. Confirmed absent from DoneDeal's full Waterford dealer directory (54 dealers, 2026-11-20); cars.ie and own sites not checked. |
| Waterford | New Line Car Sales Ltd | No current stock found (no DoneDeal dealer page at the obvious address); directory entry only. Confirmed absent from DoneDeal's full Waterford dealer directory (54 dealers, 2026-11-20); cars.ie and own sites not checked. |
| Waterford | Heffernan Car Sales | No current stock found (no DoneDeal dealer page at the obvious address); directory entry only. Confirmed absent from DoneDeal's full Waterford dealer directory (54 dealers, 2026-11-20); cars.ie and own sites not checked. |
| Waterford | Motor Sense Ltd | No current stock found; directory entry only (sales, insurance, finance, servicing). DoneDeal dealer page exists with 0 ads (2026-11-20). |
| Waterford | Derek Carey Motors | No current stock found; directory entry only. Confirmed absent from DoneDeal's full Waterford dealer directory (54 dealers, 2026-11-20); cars.ie and own sites not checked. |
| Waterford | GP Motors | No current stock found; directory entry only. Confirmed absent from DoneDeal's full Waterford dealer directory (54 dealers, 2026-11-20); cars.ie and own sites not checked. |
| Waterford | Moloney's Garage | No current stock found; directory entry only. Confirmed absent from DoneDeal's full Waterford dealer directory (54 dealers, 2026-11-20); cars.ie and own sites not checked. |
| Waterford | M O'Shea & Sons | No current stock found; directory entry only. Confirmed absent from DoneDeal's full Waterford dealer directory (54 dealers, 2026-11-20); cars.ie and own sites not checked. |
| Waterford | Moroney Jim Car Dismantlers | Breaker, not a car retailer. |
| Waterford | Maurice Dunne Motors Ltd | Service and repair garage; no car sales found. |
| Waterford | Tradesales.ie | Trade-only disposal site: 'We only deal with the motor trade', tenders and auctions for a group's 21 franchises (tradesales.ie). Not a retail dealer. |
| Kerry | Cartwright | already being pitched (Carright) |
| Kerry | Poff Motors | Small (about 30 cars at ~€10k) and already on a full CarsIreland site with stock, finance, trade-in, test drive, reviews and online reserve. |
| Kerry | Dineen O'Donoghue Motors | Small (19 cars) and already on a full CarsIreland site with stock, finance, valuation, test drive and reviews. |
| Kerry | Pat Looney Car Sales | Fewer than 15 cars (about 10 on adverts.ie, mostly €6k to €12.5k). Not in DoneDeal's Kerry dealer directory (2026-11-20). |
| Kerry | Tom Murphy's Garage | No sign of car stock for sale online (Golden Pages listing only; mostly service, tyres, recovery). Not in DoneDeal's Kerry dealer directory (81 dealers, checked 2026-11-20). |
| Kerry | AD Sales and Contracts Ltd | Not a car retailer: about 15 ads, mostly agricultural and plant machinery. |
| Kerry | Mid Kerry Trade Sales | Fewer than 15 cars (one listing on cars.ie). DoneDeal dealer page shows 3 ads (2026-11-20). |
| Kerry | Pristine Classic Cars | Classic and vintage car restorer and hire business (site title "Vintage Car Sales & Car Hire"); 19 classics on DoneDeal, not a used-car retailer we sell to. |
