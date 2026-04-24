/**
 * Rich event content used by the full guidebook/event app. Each `RSVPEvent`
 * has the core metadata + questions defined in `form-data.ts`; this module
 * holds the *sections* (overview, hotel, travel tips, daily schedules,
 * dress boards, activities, restaurants, deposits, next-steps) that get
 * rendered across the guest routes under `/rsvp/*`.
 *
 * Today this is code-seeded for Dallas's Sin City Birthday Party. When the
 * admin CMS (Phase 3) lands, these shapes will be read/written via Firestore
 * so every field can be overridden per event.
 */

export type PaymentPayee = "scott" | "dallas";

export type PaymentLink = {
  payee: PaymentPayee;
  label: string;
  /** Deep link or URL. Use tel:/mailto:/venmo://paycharge?... etc. */
  url: string;
};

/** Trip-overview day card (Day 1..6) — narrative, not a schedule. */
export type OverviewDay = {
  id: string;              // "day-1"..."day-6"
  label: string;           // "Day 1"
  dateLabel: string;       // "Thursday · July 30"
  title: string;           // "Early Dirty Birds!"
  body: string;            // paragraph copy
};

export type Hotel = {
  id: string;
  name: string;
  tagline: string;         // "BOUTIQUE/CHEAPER"
  url?: string;
};

export type TravelTip = {
  id: string;
  label: string;           // "WEATHER"
  body: string;
};

export type ScheduleRow = {
  id: string;
  time: string;            // "2:00pm Arrival", "LATE", etc.
  title: string;           // "MGM Transport for the Queen"
  note?: string;
};

/** Full daily schedule card (Day 1..5). */
export type ScheduledDay = {
  id: string;              // "thursday"..."monday"
  dayLabel: string;        // "Day 1"
  dayName: string;         // "Thursday"
  headline: string;        // "Arrive & Prepare Yourself"
  intro: string;
  rows: ScheduleRow[];
  tipTitle: string;        // "Travel Tip  &  Dress:"
  tipBody: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  /** Optional dress-code moodboard (Friday/Sunday in the PDF). */
  dressBoardId?: string;
};

/** Dress-code moodboard (Sinner Inspo / Last Supper Inspo). */
export type DressBoard = {
  id: string;              // "sinner-inspo" | "last-supper-inspo"
  eyebrow: string;         // "Sinner Inspo"
  title: string;           // "Dark, Bold, Unapologetic"
  posterUrl?: string;      // optional full-page poster image
  think: string[];         // "Gothic Luxury", "Avant Garde", etc.
  beatTheHeat: string[];   // "Lightweight", "Breathable Fabrics", etc.
  callout?: string;        // "Come dressed like the night is yours..."
};

/** A paid show/activity that requires a deposit. */
export type Activity = {
  id: string;
  dayLabel: string;        // "Thursday"
  dayDate: string;         // "July 30th"
  name: string;            // "Absinthe Show"
  time: string;            // "9:00 PM"
  venue: string;           // "Caesars' Fairy Tent"
  pricePerPerson?: number; // numeric for math, 0 or undefined if n/a
  priceLabel: string;      // human label ("$154 per person" or "Choose your activity")
  description: string;
  rsvpQuestionSlug?: string; // links to the matching wizard question
  icon: string;            // emoji fallback when no image is set
  /** Optional header photo rendered at the top of the card. */
  imageUrl?: string;
  imageAlt?: string;
  /** Extra options (e.g. SpeedVegas: go-kart / exotic / drift). */
  options?: string[];
  depositsDueBy?: string;  // "June 10th"
};

export type RestaurantItem = {
  id: string;
  dayLabel: string;        // "Saturday, Aug 2"
  name: string;            // "Toca Madera"
  venue: string;           // "Aria"
  time: string;            // "11:00 AM"
  priceRange: string;      // "$35-$50 est"
  theme?: string;          // "Themed: CEO of Sin"
  rsvpQuestionSlug?: string;
};

export type RestaurantsSection = {
  brunch: RestaurantItem[];
  dinner: RestaurantItem[];
  note: string;
};

export type DepositInfo = {
  dueDate: string;         // "June 10th"
  whyTitle: string;        // "Why RSVP & Deposit?"
  whyBody: string;
  paymentTitle: string;
  paymentBody: string;
  payees: {
    id: PaymentPayee;
    name: string;          // "Scott", "Dallas"
    paymentLinks: PaymentLink[];
  }[];
  closingCallout: string;
};

export type NextStepsSection = {
  headline: string;
  cta: string;
  body: string;
};

export type EventContent = {
  eventId: string;
  overview: {
    eyebrow: string;
    title: string;
    intro: string;
    days: OverviewDay[];
  };
  hotel: {
    eyebrow: string;
    scriptTitle: string;         // "the Cosmopolitan LV"
    body: string;
    nearbyTitle: string;
    nearbyBody: string;
    recommended: Hotel[];
    other: Hotel[];
    closing: string;
  };
  travelTips: {
    eyebrow: string;
    tips: TravelTip[];
    mandatoryTip: string;
    findDallasNote: string;
  };
  schedule: {
    days: ScheduledDay[];
  };
  dressBoards: DressBoard[];
  activities: {
    eyebrow: string;
    intro: string;
    items: Activity[];
    closingNote: string;
  };
  restaurants: {
    eyebrow: string;
    intro: string;
  } & RestaurantsSection;
  deposits: DepositInfo;
  nextSteps: NextStepsSection;
};

/* ------------------------------------------------------------------ */
/* Seed content for Dallas — extracted directly from the PDF guide.    */
/* ------------------------------------------------------------------ */

export const DALLAS_EVENT_CONTENT: EventContent = {
  eventId: "event-vegas-2026",

  overview: {
    eyebrow: "Trip Overview",
    title: "Six Days in Sin City",
    intro:
      "Six nights with Dallas — sushi at Zuma, a poolside cabana, the CEO of Sin themed dinner, Kelly Clarkson at Caesar's, Speed Vegas on Sunday, the Last Supper redemption dinner, and a final brunch tradition. Show up, pace yourself, and have a bitchin' time.",
    days: [
      {
        id: "day-1",
        label: "Day 1",
        dateLabel: "Thursday · July 30",
        title: "Early Dirty Birds!",
        body:
          "For those that want to kick it off early, you are welcome (& brave) to join the birthday queen on his birthday for an upscale sushi dinner at Zuma, located in the Cosmopolitan! Afterward, because he turns 34, meet him on the casino floor!",
      },
      {
        id: "day-2",
        label: "Day 2",
        dateLabel: "Friday · July 31",
        title: "Poolside Cabana, Sinner's Dinner & Luck!",
        body:
          "As some of you may be arriving, we invite you to join us while we wait poolside 9–5. There will be a cabana with misters, beverage & food service, and glistening pools. Our first dinner: Welcome to Sin at Bavette's, and then a night of luck!",
      },
      {
        id: "day-3",
        label: "Day 3",
        dateLabel: "Saturday · August 1",
        title: "Brunch, Hell's Kitchen, & Kelly!",
        body:
          "If you're recovered and able, we invite you to a glorious brunch at Toca Madera. After brunch we will head out on some adventures. Be ready to rock — Kelly Clarkson starts at 8:00pm at Caesar's Colosseum, with dinner at Hell's Kitchen beforehand.",
      },
      {
        id: "day-4",
        label: "Day 4",
        dateLabel: "Sunday · August 2",
        title: "Adrenaline & Redemption!",
        body:
          "Let's put the pedal to the metal! Join us for sexy, fast cars! OR cute go-karts handling tight curves! Wanna ride b*tch while drifting at high speeds? Do it! After our Sunday excursion, get ready for The Last Supper.",
      },
      {
        id: "day-5",
        label: "Day 5",
        dateLabel: "Monday · August 3",
        title: "Departure Depression or Obsession!",
        body:
          "For those that had their fill of sin, you will be looking forward to this day. For those that are sad to go… STAY. SINFUL STRAGGLERS: You're naughty… But I love your style! Join us for the official last day for the birthday whore! What will we do? What will we get into? Wait and see…",
      },
      {
        id: "day-6",
        label: "Day 6",
        dateLabel: "Tuesday · August 4",
        title: "Return Home or Go to Rehab",
        body:
          "Fly home, or check yourself in. Either way, you have earned the rest.",
      },
    ],
  },

  hotel: {
    eyebrow: "Hotel Accommodations",
    scriptTitle: "the Cosmopolitan LV",
    body:
      "Do you know her? This is Dallas' preferred hotel EVERY time. The Cosmopolitan! Central on strip, gorgeous terrace views (if you splurge), & iconic!",
    nearbyTitle: "Nearby Options",
    nearbyBody:
      "As a regular, there are many options from upscale to budget friendly. If you want to stay close to the birthday chaos but not at Cosmo — understandable.",
    recommended: [
      { id: "vdara", name: "Vdara", tagline: "Boutique / cheaper" },
      { id: "aria", name: "Aria", tagline: "Upscale & beautiful" },
      { id: "bellagio", name: "Bellagio", tagline: "Pretty iconic" },
    ],
    other: [
      { id: "planet-hollywood", name: "Planet Hollywood", tagline: "Budget & nearby" },
      { id: "paris", name: "Paris", tagline: "Nearby — Dallas has never stayed" },
      { id: "flamingo", name: "Flamingo", tagline: "Very budget friendly, solid" },
      { id: "caesars", name: "Caesars", tagline: "Further, also iconic" },
    ],
    closing:
      "Vegas, especially the strip, can be pricey. Share with a friend to help cut costs. Dallas may be able to work some magic (inquire within). If you can, stay closeby if you're wanting to walk and not Uber.",
  },

  travelTips: {
    eyebrow: "Travel Tips",
    tips: [
      {
        id: "weather",
        label: "Weather",
        body:
          "Vegas is a desert. Dallas's mom spit him out in peak summer. Expect temps in the 100s. It is very dry and easy to acclimate, but dress accordingly. And for the love of sin — HYDRATE!!!",
      },
      {
        id: "hotels",
        label: "Hotels",
        body:
          "This is important. Budget is important. Dallas often gets rooms comped because he is an MGM Rewards member. We suggest signing up for MGM Rewards (it's free) and locking in better rates that way. Same with Caesar properties.",
      },
      {
        id: "rideshare",
        label: "Uber / Lyft",
        body:
          "Rideshare can be tricky. There are only designated pick-up / drop-off areas. The apps generally tell you where to go, or follow signs within different properties.",
      },
      {
        id: "walking",
        label: "Walking",
        body:
          "Even if your GPS indicates — minutes, plan for more. Trust us. Wear comfortable shoes. 10k steps per day on average.",
      },
      {
        id: "gambling",
        label: "Gambling",
        body:
          "If you love the risk and have a budget, double it. ATMs on the strip charge $11 per withdrawal. Plan accordingly.",
      },
      {
        id: "pregame",
        label: "Pre-Game & Supplies",
        body:
          "While it is tempting to just grab from a minibar in your room — don't. We always head to Walgreens or CVS to stock up. Sunscreen for the pools. Thank us later.",
      },
      {
        id: "pricing",
        label: "Vegas Pricing",
        body:
          "Is no joke. From food, to drinks, to entertainment — off strip is generally cheaper and one day Dallas will stay off strip.",
      },
      {
        id: "pace",
        label: "Pace Yourself",
        body:
          "This is a marathon, not a race. We would hate to see you miss out on an activity. Especially one that is prepaid.",
      },
      {
        id: "culture",
        label: "Vegas Culture",
        body:
          "All walks of life. One of the most visited cities. Ignore the street performers, be careful and aware, and the prostitutes advertised on little cards aren't the women you get when you call — at least that's what we have heard…",
      },
    ],
    mandatoryTip:
      "BE DARING, BRING THE VIBE, BRING YOUR LUCK, AND HAVE A BITCHIN' TIME!",
    findDallasNote:
      "Where's Dallas? How many times will this be asked? Did you check the casino? Which one??",
  },

  schedule: {
    days: [
      {
        id: "thursday",
        dayLabel: "Day 1",
        dayName: "Thursday",
        headline: "Arrive & Prepare Yourself",
        intro:
          "Join us for the actual birthday! Dallas will arrive early afternoon and will be reserving a table at Zuma, located in the Cosmopolitan, and a show following dinner.",
        rows: [
          { id: "r1", time: "2:00 PM", title: "Arrival", note: "MGM Transport for the Queen" },
          { id: "r2", time: "3:00 PM", title: "Check-In" },
          { id: "r3", time: "5:00 PM", title: "Cocktails at Chandelier Bar" },
          { id: "r4", time: "6:30 PM", title: "Zuma — Cosmopolitan" },
          { id: "r5", time: "9:00 PM", title: "Absinthe Show — Caesar's" },
          { id: "r6", time: "LATE", title: "Lady Luck" },
        ],
        tipTitle: "Travel Tip & Dress",
        tipBody:
          "Checking in: we suggest stopping at stores before arriving to stock up on alcohol, waters, snacks, etc. Dinner: Sushi, smart casual / business dress. Show: Absinthe is one of Vegas's popular shows.",
        heroImageUrl: "/rsvp-images/kelly.jpg",
        heroImageAlt: "Absinthe show performer",
      },
      {
        id: "friday",
        dayLabel: "Day 2",
        dayName: "Friday",
        headline: "Poolside, Sinner Dinner, Casino Crawl!",
        intro:
          "Join Dallas while he eagerly waits the remaining guests poolside in a cabana. After, prepare yourself for the “Welcome to Sin” dinner. Dinner is themed. After dinner, explore the strip, win a jackpot… then lose it.",
        rows: [
          { id: "r1", time: "11:00 AM", title: "Poolside Brunch — Verona Cabana, Bellagio", note: "5 PM Close" },
          { id: "r2", time: "6:30 PM", title: "Cocktail — Vdara Lobby Bar" },
          { id: "r3", time: "7:30 PM", title: "Bavette's @ Park MGM", note: "“Sinners Dinner” THEMED" },
          { id: "r4", time: "10:00 PM", title: "Cheers — Dallas's suite" },
          { id: "r5", time: "LATE", title: "Casino Crawl" },
        ],
        tipTitle: "Travel Tip | Dress Code",
        tipBody:
          "Cabana is based on 8 person occupancy. Details under RSVP / Deposit. Dinner: THEMED. “CEO of SIN” — high fashion, sexy, dark, dominatrix… GO WILD.",
        heroImageUrl: "/rsvp-images/bavettes.webp",
        heroImageAlt: "Bavette's Steakhouse dining room",
        dressBoardId: "sinner-inspo",
      },
      {
        id: "saturday",
        dayLabel: "Day 3",
        dayName: "Saturday",
        headline: "Brunch and Kelly!",
        intro:
          "For those that can make it, join for brunch! Today will be exploration. Shopping, gambling,… maybe a little adventure. Be ready by 7:30 for Kelly Clarkson!",
        rows: [
          { id: "r1", time: "11:00 AM", title: "Brunch — Toca Madera, Aria" },
          { id: "r2", time: "1:00 PM", title: "Fremont St / Shops / Crystals / Meow Wolf" },
          { id: "r3", time: "5:30 PM", title: "Hell's Kitchen, Caesars" },
          { id: "r4", time: "7:30 PM", title: "Kelly Clarkson — arrive" },
          { id: "r5", time: "8:00 PM", title: "SHOW TIME" },
          { id: "r6", time: "LATE", title: "Gamble! Mischief! …duh!" },
        ],
        tipTitle: "Travel Tip | Dress Code",
        tipBody:
          "This is a long day, pace yourselves! Honestly, wear what you want! Dallas plans to wear his best 90s grunge / concert attire.",
        heroImageUrl: "/rsvp-images/kelly.jpg",
        heroImageAlt: "Kelly Clarkson glamour portrait",
      },
      {
        id: "sunday",
        dayLabel: "Day 4",
        dayName: "Sunday",
        headline: "Brunch, Adrenaline, Redemption & Jackpots!",
        intro:
          "She wanted to be butch and do something different! Join Dallas on the track… “hopefully the instructor is hot!” For dinner, join for The Last Supper. Do you need to repent? Have you accepted the blood of Christ, or another martini?",
        rows: [
          { id: "r1", time: "11:00 AM", title: "Brunch — Sadelle's, Bellagio" },
          { id: "r2", time: "1:30 PM", title: "Speed Vegas, Racing" },
          { id: "r3", time: "7:30 PM", title: "LAGO, Bellagio — Redemption Dinner", note: "THEMED" },
          { id: "r4", time: "LATE", title: "Last Chance to Sin" },
        ],
        tipTitle: "Travel Tip | Dress Code",
        tipBody:
          "Weather is HOT. We are going into the desert — dress accordingly. For dinner: wear your most angelic, modest, yet glamorous attire! It's okay to be a wittle sexy… whites, creams, neutrals, golds… reborn but… rich!",
        heroImageUrl: "/rsvp-images/speedway.jpg",
        heroImageAlt: "SpeedVegas exotic car",
        dressBoardId: "last-supper-inspo",
      },
      {
        id: "monday",
        dayLabel: "Day 5",
        dayName: "Monday",
        headline: "Recovery & FOMO",
        intro:
          "Not done yet? Join us for a day of recovery and FOMO. Brunch, spa day, last minute “I wanted to go here”… just because!",
        rows: [
          { id: "r1", time: "11:30 AM", title: "Brunch Bitch Tradition — Salt & Ivy, Aria" },
          { id: "r2", time: "1:00 PM", title: "SPA / Whatever YOU want" },
          { id: "r3", time: "6:30 PM", title: "Cocktails — Vdara Lobby Bar" },
          { id: "r4", time: "7:30 PM", title: "Gymkhana (2-star Michelin Indian) — Aria" },
        ],
        tipTitle: "Travel Tip | Dress Code",
        tipBody: "No more tips, no more rules. You're on your own, kid…",
        heroImageUrl: "/rsvp-images/dallas-hero.webp",
        heroImageAlt: "Aria spa interior",
      },
    ],
  },

  dressBoards: [
    {
      id: "sinner-inspo",
      eyebrow: "Sinner Inspo",
      title: "Dark, Bold, Unapologetic",
      callout:
        "Come dressed like the night is yours. We'll handle the sinning. 100+ temperatures. Even hotter energy.",
      think: [
        "Gothic Luxury",
        "Avant Garde",
        "High Fashion",
        "Powerful Silhouettes",
        "Monochrome",
        "Texture",
        "Statement Accessories",
      ],
      beatTheHeat: [
        "Stay cool — look hot",
        "Lightweight",
        "Breathable Fabrics",
        "Linen & Silks",
        "Mesh & Sheer",
      ],
    },
    {
      id: "last-supper-inspo",
      eyebrow: "Last Supper Inspo",
      title: "Pure, Elevated, Unapologetically Redeemed",
      callout:
        "Come dressed like you've been forgiven. Let's end the weekend in redemption.",
      think: [
        "Heavenly Luxury",
        "Soft Glamour",
        "Luxe Textures",
        "Linen & Silks",
        "Upscale Resort",
        "Statement Accessories",
      ],
      beatTheHeat: [
        "Stay cool, look hot",
        "Lightweight",
        "Breathable Fabrics",
        "Linen & Silks",
        "Mesh & Sheer",
      ],
    },
  ],

  activities: {
    eyebrow: "Activities & Shows",
    intro:
      "Deposits establish group seating for these headliners. RSVP and send your deposit by June 10th — payment goes to Scott or Dallas. You can always buy your own seats separately if you prefer.",
    items: [
      {
        id: "absinthe",
        dayLabel: "Thursday",
        dayDate: "July 30th",
        name: "Absinthe Show",
        time: "9:00 PM",
        venue: "Caesar's Palace — Fairy Tent",
        pricePerPerson: 154,
        priceLabel: "$154 per person",
        description:
          "One of Vegas's most popular shows. Expect ~120–160 minute run time. Deposits hold group seating.",
        rsvpQuestionSlug: "absinthe-show",
        icon: "🎩",
        depositsDueBy: "June 10th",
      },
      {
        id: "cabana",
        dayLabel: "Friday",
        dayDate: "July 31st",
        name: "Poolside Cabana",
        time: "9:00 AM – 5:00 PM",
        venue: "Verona Cabana — Bellagio",
        pricePerPerson: 70,
        priceLabel: "$70 per person",
        description:
          "Check-in by 11:00 AM. First come, first serve. 6-person capacity. Food & beverage service included.",
        rsvpQuestionSlug: "poolside-cabana",
        icon: "🏊",
        depositsDueBy: "June 10th",
      },
      {
        id: "kelly",
        dayLabel: "Saturday",
        dayDate: "August 1st",
        name: "Kelly Clarkson",
        time: "8:00 PM",
        venue: "Caesar's Colosseum",
        pricePerPerson: 256,
        priceLabel: "$256 per person",
        description:
          "Group seating next to Dallas. Deposits hold your seat by June 10th, or buy your own ticket elsewhere.",
        rsvpQuestionSlug: "kelly-clarkson",
        icon: "🎤",
        imageUrl: "/rsvp-images/kelly.jpg",
        imageAlt: "Kelly Clarkson performing",
        depositsDueBy: "June 10th",
      },
      {
        id: "speed-vegas",
        dayLabel: "Sunday",
        dayDate: "August 2nd",
        name: "Speed Vegas",
        time: "1:30 PM",
        venue: "Uber — 15 min drive",
        priceLabel: "$35 – $599 (choose your activity)",
        description:
          "Go-karts, exotic car racing, passenger drifting. Dallas will contact the venue — please indicate which experiences interest you.",
        rsvpQuestionSlug: "speed-vegas",
        icon: "🏎",
        imageUrl: "/rsvp-images/speedway.jpg",
        imageAlt: "SpeedVegas exotic car",
        options: ["Go-Karts (from $35)", "Exotic Car Racing ($299+)", "Passenger Drifting ($99)"],
        depositsDueBy: "June 10th",
      },
    ],
    closingNote:
      "Sitting next to the birthday boy isn't that important — he doesn't want anyone to miss out on the shows!",
  },

  restaurants: {
    eyebrow: "Restaurants",
    intro:
      "Brunches and dinners are not mandatory. Friday & Sunday are themed. If choosing all options, expect $500–$800 depending on the day. RSVP / headcount by June 10th.",
    brunch: [
      {
        id: "toca-madera",
        dayLabel: "Saturday, Aug 2",
        name: "Toca Madera",
        venue: "Aria",
        time: "11:00 AM",
        priceRange: "$35–$50 est",
        rsvpQuestionSlug: "toca-madera-brunch",
      },
      {
        id: "sadelles",
        dayLabel: "Sunday, Aug 3",
        name: "Sadelle's",
        venue: "Bellagio",
        time: "11:00 AM",
        priceRange: "$35–$50 est",
        rsvpQuestionSlug: "sadelles-brunch",
      },
      {
        id: "salt-ivy",
        dayLabel: "Monday, Aug 4",
        name: "Salt & Ivy",
        venue: "Aria",
        time: "11:30 AM",
        priceRange: "$28–$45 est",
        rsvpQuestionSlug: "salt-ivy-brunch",
      },
    ],
    dinner: [
      {
        id: "zuma",
        dayLabel: "Thursday, Jul 30",
        name: "Zuma",
        venue: "The Cosmopolitan",
        time: "6:30 PM",
        priceRange: "$80–$150 est",
        rsvpQuestionSlug: "zuma-dinner",
      },
      {
        id: "bavettes",
        dayLabel: "Friday, Jul 31",
        name: "Bavette's Steakhouse",
        venue: "Park MGM",
        time: "7:30 PM",
        priceRange: "$80–$150 est",
        theme: "Themed: CEO of Sin",
        rsvpQuestionSlug: "sinners-dinner",
      },
      {
        id: "hells-kitchen",
        dayLabel: "Saturday, Aug 1",
        name: "Hell's Kitchen",
        venue: "Caesars",
        time: "5:30 PM",
        priceRange: "$60–$120 est",
        theme: "Before Kelly Clarkson",
        rsvpQuestionSlug: "pre-kelly-dinner",
      },
      {
        id: "lago",
        dayLabel: "Sunday, Aug 2",
        name: "LAGO",
        venue: "Bellagio",
        time: "7:30 PM",
        priceRange: "$80–$150 est",
        theme: "Themed: The Last Supper — Redemption",
        rsvpQuestionSlug: "last-supper",
      },
      {
        id: "gymkhana",
        dayLabel: "Monday, Aug 3",
        name: "Gymkhana",
        venue: "Aria",
        time: "7:30 PM",
        priceRange: "$50–$100 est (family style)",
        rsvpQuestionSlug: "gymkhana-dinner",
      },
    ],
    note:
      "Friday's Sinners Dinner and Sunday's Last Supper are both themed — dress accordingly. See the day pages for the full inspo boards.",
  },

  deposits: {
    dueDate: "June 10th",
    whyTitle: "Why RSVP & Deposit?",
    whyBody:
      "We need a headcount for all reservations and events. Your deposit secures group seating at shows. The RSVP for restaurants secures your chair at the table.",
    paymentTitle: "Payment Info",
    paymentBody:
      "Deposits are required per person for paid events and activities. If you're paying for a show, please send payment to Scott or Dallas.",
    payees: [
      {
        id: "scott",
        name: "Scott",
        paymentLinks: [
          { payee: "scott", label: "Venmo @scott-placeholder", url: "https://venmo.com/u/scott-placeholder" },
          { payee: "scott", label: "PayPal — placeholder", url: "https://paypal.me/scottplaceholder" },
          { payee: "scott", label: "Zelle — placeholder", url: "mailto:scott@weblisters.com?subject=Dallas%20Vegas%20deposit" },
        ],
      },
      {
        id: "dallas",
        name: "Dallas",
        paymentLinks: [
          { payee: "dallas", label: "Venmo @dallas-placeholder", url: "https://venmo.com/u/dallas-placeholder" },
          { payee: "dallas", label: "PayPal — placeholder", url: "https://paypal.me/dallasplaceholder" },
          { payee: "dallas", label: "Zelle — placeholder", url: "mailto:dallas-placeholder@example.com?subject=Dallas%20Vegas%20deposit" },
        ],
      },
    ],
    closingCallout:
      "RSVP for each event and dining experience so we can reserve your spot. Deposits & RSVPs due by June 10th.",
  },

  nextSteps: {
    headline: "Next Steps",
    cta: "Click here",
    body:
      "We're adding a live itinerary tracker, per-guest dress board saves, and photo uploads. Under maintenance — come back soon.",
  },
};
