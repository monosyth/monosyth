import { DALLAS_EVENT_CONTENT, type EventContent } from "./event-content";

export type RSVPQuestionType =
  | "short_text"
  | "email"
  | "number"
  | "single_select"
  | "multi_select"
  | "long_text";

export type RSVPOption = {
  id: string;
  value: string;
  label: string;
  description?: string;
};

export type RSVPConditionalRule = {
  questionId: string;
  equalsAny: string[];
};

export type RSVPQuestion = {
  id: string;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  type: RSVPQuestionType;
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: RSVPOption[];
  showWhen?: RSVPConditionalRule;
  imageUrl?: string;
  imageAlt?: string;
};

export type RSVPImageAsset = {
  id: string;
  label: string;
  url: string;
};

/**
 * Catalog of images bundled with the RSVP app. Admins can assign these to any
 * question from the admin studio. Add new entries here (and drop the image
 * file in `public/rsvp-images/`) to extend the picker.
 */
export const RSVP_IMAGE_LIBRARY: RSVPImageAsset[] = [
  {
    id: "dallas",
    label: "Dallas — hero photo",
    url: "/rsvp-images/dallas.jpg",
  },
  {
    id: "dallas-balcony",
    label: "Dallas — balcony portrait",
    url: "/rsvp-images/dallas-hero.webp",
  },
  {
    id: "bavettes",
    label: "Bavette's — CEO of Sin dinner",
    url: "/rsvp-images/bavettes.webp",
  },
  {
    id: "kelly",
    label: "Kelly Clarkson concert",
    url: "/rsvp-images/kelly.jpg",
  },
  {
    id: "speedway",
    label: "SpeedVegas racing",
    url: "/rsvp-images/speedway.jpg",
  },
];

export function getRsvpImageByUrl(url: string | undefined) {
  if (!url) return undefined;
  return RSVP_IMAGE_LIBRARY.find((asset) => asset.url === url);
}

/**
 * Rich guidebook content attached to an event. Full shape defined in
 * @/lib/rsvp/event-content. We declare it as an optional `unknown` here so
 * the two modules can stay decoupled (event-content imports RSVPEvent-related
 * types from this file; RSVPEvent.content is typed as EventContent via
 * module augmentation below).
 */
export type RSVPEvent = {
  id: string;
  slug: string;
  eventLabel: string;
  title: string;
  welcomeTitle: string;
  timeframe: string;
  location: string;
  summary: string;
  intro: string;
  notes: string[];
  questions: RSVPQuestion[];
  /** Rich content sections (overview, hotel, days, etc). */
  content?: EventContent;
};

export type RSVPStudio = {
  events: RSVPEvent[];
};

export type RSVPAnswer = string | string[];

export const questionTypeOptions: Array<{
  value: RSVPQuestionType;
  label: string;
}> = [
  { value: "short_text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "single_select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "long_text", label: "Long text" },
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function formatSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function createOption(
  id: string,
  value: string,
  label: string,
  description?: string,
): RSVPOption {
  return { id, value, label, description };
}

function cloneOption(option: RSVPOption): RSVPOption {
  return {
    ...option,
    id: createId("option"),
  };
}

function createQuestion(question: RSVPQuestion): RSVPQuestion {
  return question;
}

function createAttendanceOptions(withMaybeDescription = "Decide later.") {
  return [
    createOption("option-attending", "attending", "Attending"),
    createOption(
      "option-might-attend",
      "might-attend",
      "Might Attend",
      withMaybeDescription,
    ),
    createOption("option-cant-make-it", "cant-make-it", "Can't Make It"),
  ];
}

function createWeekendOptions() {
  return [
    createOption(
      "option-weekend-attending",
      "attending",
      "Attending",
      "I'm in for the weekend and will sort the final details below.",
    ),
    createOption(
      "option-weekend-cant-make-it",
      "cant-make-it",
      "Can't Make It",
      "I'm not able to make the trip this time.",
    ),
  ];
}

function createYesNoMaybeOptions() {
  return [
    createOption("option-yes", "yes", "Yes"),
    createOption("option-maybe", "maybe", "Maybe", "I am still deciding."),
    createOption("option-no", "no", "No"),
  ];
}

function createTextQuestion(
  id: string,
  slug: string,
  title: string,
  description: string,
  type: RSVPQuestionType,
  placeholder: string,
  required = true,
): RSVPQuestion {
  return createQuestion({
    id,
    slug,
    eyebrow: "Guest details",
    title,
    description,
    type,
    required,
    placeholder,
  });
}

function createSelectQuestion(
  id: string,
  slug: string,
  eyebrow: string,
  title: string,
  description: string,
  options: RSVPOption[],
  showWhen?: RSVPConditionalRule,
): RSVPQuestion {
  return createQuestion({
    id,
    slug,
    eyebrow,
    title,
    description,
    type: "single_select",
    required: true,
    options,
    showWhen,
  });
}

function createMultiSelectQuestion(
  id: string,
  slug: string,
  eyebrow: string,
  title: string,
  description: string,
  options: RSVPOption[],
  showWhen?: RSVPConditionalRule,
): RSVPQuestion {
  return createQuestion({
    id,
    slug,
    eyebrow,
    title,
    description,
    type: "multi_select",
    required: true,
    options,
    showWhen,
  });
}

function createLongTextQuestion(
  id: string,
  slug: string,
  eyebrow: string,
  title: string,
  description: string,
  placeholder: string,
  required = false,
  showWhen?: RSVPConditionalRule,
): RSVPQuestion {
  return createQuestion({
    id,
    slug,
    eyebrow,
    title,
    description,
    type: "long_text",
    required,
    placeholder,
    showWhen,
  });
}

function cloneQuestion(question: RSVPQuestion): RSVPQuestion {
  return {
    ...question,
    id: createId("question"),
    slug: formatSlug(`${question.slug}-copy`) || createId("question"),
    options: question.options?.map(cloneOption),
  };
}

export function createBlankQuestion(order = 1): RSVPQuestion {
  return {
    id: createId("question"),
    slug: formatSlug(`question-${order}`),
    eyebrow: "Custom question",
    title: `New Question ${order}`,
    description: "Write the prompt or context for this step.",
    type: "single_select",
    required: true,
    options: [
      {
        id: createId("option"),
        value: "yes",
        label: "Yes",
      },
      {
        id: createId("option"),
        value: "no",
        label: "No",
      },
    ],
  };
}

export function createBlankEvent(order = 1): RSVPEvent {
  const eventId = createId("event");
  const firstQuestion = createBlankQuestion(1);

  return {
    id: eventId,
    slug: formatSlug(`new-event-${order}`),
    eventLabel: "Draft event",
    title: `New Event ${order}`,
    welcomeTitle: "Build your next RSVP experience.",
    timeframe: "Choose dates",
    location: "Choose location",
    summary: "Add the details for your next event.",
    intro:
      "Set the schedule, write the questions, and publish the event when it is ready.",
    notes: [
      "This event saves into the shared Monosyth RSVP studio once an admin publishes it.",
    ],
    questions: [firstQuestion],
  };
}

export function duplicateQuestionTemplate(question: RSVPQuestion) {
  return cloneQuestion(question);
}

export function duplicateEventTemplate(event: RSVPEvent): RSVPEvent {
  const questionIdMap = new Map<string, string>();

  const clonedQuestions = event.questions.map((question) => {
    const clonedQuestion = cloneQuestion(question);
    questionIdMap.set(question.id, clonedQuestion.id);
    return clonedQuestion;
  });

  return {
    ...event,
    id: createId("event"),
    slug: formatSlug(`${event.slug}-copy`) || createId("event"),
    title: `${event.title} Copy`,
    questions: clonedQuestions.map((question) => ({
      ...question,
      showWhen: question.showWhen
        ? {
            questionId:
              questionIdMap.get(question.showWhen.questionId) ??
              question.showWhen.questionId,
            equalsAny: [...question.showWhen.equalsAny],
          }
        : undefined,
    })),
  };
}

const vegasStudio: RSVPEvent = {
  id: "event-vegas-2026",
  slug: "dallas-in-vegas-2026",
  eventLabel: "Dallas turns 34",
  title: "Dallas's Sin City Birthday Party",
  welcomeTitle: "We're off to Las Vegas, baby!",
  timeframe: "July 30 – August 4",
  location: "Las Vegas, Nevada",
  summary:
    "Six nights of dinners, shows, pool time, themed dinners, and just enough redemption.",
  intro:
    "Join Dallas in Sin City for the birthday long weekend — dinners at Zuma, Bavette's, Hell's Kitchen and LAGO; shows, cabana, Kelly Clarkson, and Speed Vegas; plus brunch every morning we manage to open our eyes.",
  notes: [
    "RSVP and submit deposits by June 10th to secure your seat at shows, cabanas, dinners, and brunches.",
    "Deposits hold group seating for paid events. RSVPs hold your chair at each table.",
    "Send payment for paid events (Absinthe, Cabana, Kelly Clarkson) to Scott or Dallas.",
    "You can attend dinners without the paired show — just RSVP separately.",
    "Themed dinners: 'CEO of Sin' (Friday) and 'The Last Supper: Redemption' (Sunday). Dressing in theme is highly encouraged.",
  ],
  questions: [
    createTextQuestion(
      "vegas-guest-name",
      "guest-name",
      "What name should appear on this RSVP?",
      "This is the lead guest name we should use for reservations and follow-up.",
      "short_text",
      "Scott Waite",
    ),
    createTextQuestion(
      "vegas-guest-email",
      "guest-email",
      "What email should receive planning updates?",
      "We will use this for confirmations, timing changes, and any deposit follow-up.",
      "email",
      "guest@example.com",
    ),
    {
      id: "vegas-party-size",
      slug: "party-size",
      eyebrow: "Guest details",
      title: "How many guests are in your party?",
      description: "Use the total count that should be considered for tables, tickets, and planning.",
      type: "number",
      required: true,
      placeholder: "1",
      min: 1,
      max: 12,
    },
    {
      ...createSelectQuestion(
        "vegas-weekend-status",
        "weekend-commitment",
        "Weekend commitment",
        "Will Dallas see you there?",
        "Even if you cannot make every part of the trip, mark attending and we will iron out the details after this.",
        createWeekendOptions(),
      ),
      imageUrl: "/rsvp-images/dallas.jpg",
      imageAlt: "Dallas — Sin City birthday hero photo",
    },
    createSelectQuestion(
      "vegas-zuma-dinner",
      "zuma-dinner",
      "Dinner reservation",
      "Dinner: Zuma, July 30th",
      "The birthday dinner on Thursday, July 30th is inside Cosmopolitan. Kickstarting the weekend.",
      createAttendanceOptions(
        'For all "maybe" dining answers, I will be adding you first. It is easier to cancel than to add a seat later.',
      ),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    createSelectQuestion(
      "vegas-absinthe",
      "absinthe-show",
      "Show ticket",
      "Show: Absinthe, $150 per person, Caesars' Fairy Tent, July 30th",
      "One of Vegas's most popular shows. The 9:00pm production usually runs 120 to 160 minutes, and deposits are needed by June 10th for group seating.",
      createAttendanceOptions("Decide by June 10th."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    createSelectQuestion(
      "vegas-cabana",
      "poolside-cabana",
      "Pool day",
      "Poolside Cabana! ($70 ea.) Bellagio, Friday July 31",
      "Verona Cabana at Bellagio with food, beverage service, and shaded seating from 9:00am to 5:00pm. Deposits are needed by June 10th.",
      createAttendanceOptions("Decide by June 10th."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    {
      ...createSelectQuestion(
        "vegas-sinners-dinner",
        "sinners-dinner",
        "Themed dinner",
        "Sinners Dinner! (Themed) Friday, July 31",
        "The first themed dinner: \"Welcome to Sin!\" at Bavette's Steakhouse inside Park MGM. Dressing in theme is highly encouraged.",
        createAttendanceOptions("Will be added to the reservation."),
        {
          questionId: "vegas-weekend-status",
          equalsAny: ["attending"],
        },
      ),
      imageUrl: "/rsvp-images/bavettes.webp",
      imageAlt: "Bavette's Steakhouse dining room",
    },
    createSelectQuestion(
      "vegas-toca-madera",
      "toca-madera-brunch",
      "Brunch",
      "Brunch! Toca Madera: Saturday, Aug. 1",
      "Toca Madera brunch on Saturday, Aug. 1 inside Aria.",
      createAttendanceOptions("Will be added to the reservation."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    createSelectQuestion(
      "vegas-hells-kitchen",
      "pre-kelly-dinner",
      "Dinner reservation",
      "Dinner! Sat. Aug 1, Before Kelly: Hell's Kitchen",
      "Dinner is scheduled for 5:30pm before the concert. You can join for dinner even if you are not going to the show.",
      createAttendanceOptions("Will be added to the reservation."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    {
      ...createSelectQuestion(
        "vegas-kelly",
        "kelly-clarkson",
        "Concert ticket",
        "Kelly Clarkson! Sat. Aug 1st. $256 per person!",
        "Tickets for group seating next to Dallas are $256 per person. Deposit needed by June 10th, or you can buy your own seats elsewhere.",
        createAttendanceOptions("You can always buy tickets on your own."),
        {
          questionId: "vegas-weekend-status",
          equalsAny: ["attending"],
        },
      ),
      imageUrl: "/rsvp-images/kelly.jpg",
      imageAlt: "Kelly Clarkson performing at Caesar's Colosseum",
    },
    createSelectQuestion(
      "vegas-sadelles",
      "sadelles-brunch",
      "Brunch",
      "Brunch! Sadelle's: Sunday, Aug 2nd",
      "Located just inside the Bellagio Conservatory. Brunch is Sunday at 11:00am, assuming we recover from the previous night.",
      createAttendanceOptions("Will still be added to the reservation."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    {
      ...createSelectQuestion(
        "vegas-speed",
        "speed-vegas",
        "Adrenaline",
        "Speed Vegas: Sun. Aug 2 Racing + Go-Karts!",
        "Choose between exotic car racing, passenger drifting, or go-karts. Dallas will contact the venue based on what everyone wants to do.",
        [
          createOption("vegas-speed-attending", "attending", "Attending"),
          createOption(
            "vegas-speed-maybe",
            "might-attend",
            "Might Attend",
            "Decide by June 10th.",
          ),
          createOption(
            "vegas-speed-no",
            "cant-make-it",
            "Can't Make It",
            "Too butch for me!",
          ),
        ],
        {
          questionId: "vegas-weekend-status",
          equalsAny: ["attending"],
        },
      ),
      imageUrl: "/rsvp-images/speedway.jpg",
      imageAlt: "SpeedVegas exotic car racing track",
    },
    createMultiSelectQuestion(
      "vegas-speed-interests",
      "speed-vegas-interests",
      "Activity details",
      "Which Speed Vegas activity interests you?",
      "Exotic car racing starts at $299 for 5 laps, passenger drifting is $99, and go-karts start at $35.",
      [
        createOption(
          "vegas-exotic-racing",
          "exotic-racing",
          "Exotic Racing",
          "$299+, depends on car selection and laps.",
        ),
        createOption(
          "vegas-passenger-drifting",
          "passenger-drifting",
          "Passenger Drifting",
          "$99.",
        ),
        createOption(
          "vegas-go-karts",
          "go-karts",
          "Go-Karts",
          "$35+, depends on how many races.",
        ),
      ],
      {
        questionId: "vegas-speed",
        equalsAny: ["attending", "might-attend"],
      },
    ),
    createSelectQuestion(
      "vegas-last-supper",
      "last-supper",
      "Themed dinner",
      "The Last Supper! (Themed) Sunday Aug 2",
      "The Redemption Dinner at Lago inside Bellagio at 7:30pm. Themed attire is encouraged, and this is the last theme. Promise.",
      createAttendanceOptions("Will be added to the reservation."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    createSelectQuestion(
      "vegas-salt-ivy",
      "salt-ivy-brunch",
      "Brunch tradition",
      "Brunch Bitch Tradition! Mon. Aug 2, Salt & Ivy",
      "The final brunch of the trip for anyone still sinfully straggling. Located in Aria at 11:30am.",
      createAttendanceOptions("Will be added to the reservation."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    createSelectQuestion(
      "vegas-gymkhana",
      "gymkhana-dinner",
      "Dinner reservation",
      "Dinner! Gymkhana Mon. Aug 3, 7:30pm",
      "Traditional and nontraditional Indian cuisine from the UK's 2-star Michelin export. Join if you are still somehow around.",
      createAttendanceOptions("Will be added to the reservation."),
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
    createLongTextQuestion(
      "vegas-host-notes",
      "host-notes",
      "Host notes",
      "Anything the planner should know before locking reservations?",
      "Dietary notes, arrival timing, ticket caveats, or anything else worth attaching to your RSVP.",
      "Flying in late, only joining dinners, bringing an extra guest...",
      false,
      {
        questionId: "vegas-weekend-status",
        equalsAny: ["attending"],
      },
    ),
  ],
  content: DALLAS_EVENT_CONTENT,
};

const salonStudio: RSVPEvent = {
  id: "event-salon-2026",
  slug: "monosyth-design-salon",
  eventLabel: "Creative gathering",
  title: "Monosyth Design Salon",
  welcomeTitle: "A smaller room, sharper conversation, and a lot more intent.",
  timeframe: "September 18",
  location: "Downtown Los Angeles",
  summary:
    "A one-night salon for design, product, and internet people with dinner, lightning talks, and a late coffee circle.",
  intro:
    "An evening of dinner, sharp conversation, lightning talks, and a slower after-hours coffee circle.",
  notes: [
    "Doors open at 6:00pm and the first round of talks starts at 6:45pm.",
    "Dinner is plated, so dietary answers matter.",
    "A few seats are held for friends-of-friends until the week before the event.",
  ],
  questions: [
    createTextQuestion(
      "salon-name",
      "guest-name",
      "What name should be on the guest list?",
      "Use the name you want on your place card and attendee roster.",
      "short_text",
      "Jordan Rivera",
    ),
    createTextQuestion(
      "salon-email",
      "guest-email",
      "Where should the final event details go?",
      "This address gets the final timing note, venue access details, and photo share link.",
      "email",
      "jordan@example.com",
    ),
    createSelectQuestion(
      "salon-attending",
      "attending-status",
      "Attendance",
      "Are you coming to the salon?",
      "Space is intentionally limited, so a clear signal helps us release seats if needed.",
      createYesNoMaybeOptions(),
    ),
    createSelectQuestion(
      "salon-dinner",
      "dinner-participation",
      "Dinner",
      "Will you stay for the shared dinner?",
      "Dinner is served family-style right after the talk block.",
      createYesNoMaybeOptions(),
      {
        questionId: "salon-attending",
        equalsAny: ["yes", "maybe"],
      },
    ),
    createSelectQuestion(
      "salon-track",
      "conversation-track",
      "Conversation track",
      "Which topic block sounds most like you?",
      "This helps balance seating and small-group conversations.",
      [
        createOption(
          "salon-track-brand",
          "brand-systems",
          "Brand Systems",
          "Identity, taste, and editorial direction.",
        ),
        createOption(
          "salon-track-product",
          "product-ux",
          "Product UX",
          "Interfaces, workflows, and product thinking.",
        ),
        createOption(
          "salon-track-ai",
          "ai-tools",
          "AI Tools",
          "Practical workflows, tools, and real-world use cases.",
        ),
      ],
      {
        questionId: "salon-attending",
        equalsAny: ["yes", "maybe"],
      },
    ),
    createMultiSelectQuestion(
      "salon-coffee",
      "after-hours-circle",
      "After-hours",
      "What would you join after dinner?",
      "Pick one or more options so we can split the room naturally.",
      [
        createOption(
          "salon-coffee-nightcap",
          "nightcap",
          "Nightcap",
          "A quieter sit-down drink nearby.",
        ),
        createOption(
          "salon-coffee-walk",
          "walking-circle",
          "Walking Circle",
          "A slow post-dinner walk and catch-up.",
        ),
        createOption(
          "salon-coffee-coffee",
          "late-coffee",
          "Late Coffee",
          "One more coffee and a smaller conversation cluster.",
        ),
      ],
      {
        questionId: "salon-attending",
        equalsAny: ["yes", "maybe"],
      },
    ),
    createLongTextQuestion(
      "salon-dietary",
      "dietary-notes",
      "Dietary notes",
      "Anything we should know before the menu is finalized?",
      "Allergies, restrictions, or anything that would help the dinner feel easy.",
      "Vegetarian, no shellfish, gluten-free...",
      false,
      {
        questionId: "salon-dinner",
        equalsAny: ["yes", "maybe"],
      },
    ),
  ],
};

const retreatStudio: RSVPEvent = {
  id: "event-retreat-2026",
  slug: "autumn-cabin-weekend",
  eventLabel: "Weekend retreat",
  title: "Autumn Cabin Weekend",
  welcomeTitle: "A slower RSVP flow for a slower weekend.",
  timeframe: "October 24 - 26",
  location: "Hood Canal, Washington",
  summary:
    "A cabin weekend with shared meals, lake time, and just enough structure to keep the logistics painless.",
  intro:
    "A slower weekend by the water with shared meals, cabin stays, and room for a little spontaneity.",
  notes: [
    "Cabin rooms are assigned after RSVPs close.",
    "The Saturday dinner menu changes depending on dietary answers.",
    "Lake activities are weather-dependent, so this is mostly for rough planning.",
  ],
  questions: [
    createTextQuestion(
      "retreat-name",
      "guest-name",
      "Who is this RSVP for?",
      "Use the primary name we should plan around for the cabin list.",
      "short_text",
      "Morgan Lee",
    ),
    createTextQuestion(
      "retreat-email",
      "guest-email",
      "What email should get the trip packet?",
      "The trip packet includes packing notes, directions, and the grocery split.",
      "email",
      "morgan@example.com",
    ),
    createSelectQuestion(
      "retreat-attending",
      "attending-status",
      "Attendance",
      "Are you joining the cabin weekend?",
      "A maybe is okay, but room assignments happen quickly once the group solidifies.",
      createAttendanceOptions("We can hold a soft maybe for a little longer."),
    ),
    createSelectQuestion(
      "retreat-nights",
      "nights-staying",
      "Lodging",
      "Which nights are you planning to stay?",
      "This helps with room grouping and meal counts.",
      [
        createOption(
          "retreat-night-friday",
          "friday-saturday",
          "Friday + Saturday",
          "The full weekend stay.",
        ),
        createOption(
          "retreat-night-saturday",
          "saturday-only",
          "Saturday only",
          "One-night stay.",
        ),
        createOption(
          "retreat-night-daytrip",
          "daytrip",
          "Day trip only",
          "No overnight stay.",
        ),
      ],
      {
        questionId: "retreat-attending",
        equalsAny: ["attending", "might-attend"],
      },
    ),
    createSelectQuestion(
      "retreat-room",
      "room-preference",
      "Cabin setup",
      "What kind of room setup feels best?",
      "We cannot guarantee every preference, but this helps the first draft of room assignments.",
      [
        createOption(
          "retreat-room-private",
          "private-room",
          "Private room if possible",
          "Willing to pay the premium if it exists.",
        ),
        createOption(
          "retreat-room-shared",
          "shared-room",
          "Shared room",
          "Happy to share with one or two people.",
        ),
        createOption(
          "retreat-room-flex",
          "flexible",
          "Flexible",
          "Place me wherever the layout works best.",
        ),
      ],
      {
        questionId: "retreat-nights",
        equalsAny: ["friday-saturday", "saturday-only"],
      },
    ),
    createMultiSelectQuestion(
      "retreat-activities",
      "activity-interests",
      "Saturday plans",
      "Which cabin activities sound good?",
      "Choose anything that would make you say yes faster.",
      [
        createOption(
          "retreat-activity-kayak",
          "kayaking",
          "Kayaking",
          "Weather permitting.",
        ),
        createOption(
          "retreat-activity-fire",
          "firepit",
          "Firepit night",
          "Blankets, drinks, and a long conversation.",
        ),
        createOption(
          "retreat-activity-cook",
          "group-cooking",
          "Group cooking",
          "An everyone-in-the-kitchen kind of dinner prep.",
        ),
      ],
      {
        questionId: "retreat-attending",
        equalsAny: ["attending", "might-attend"],
      },
    ),
    createLongTextQuestion(
      "retreat-food",
      "food-notes",
      "Meal notes",
      "Anything we should know before building the menu?",
      "Dietary needs, coffee preferences, or the snack you always hope someone brings.",
      "No dairy, extra coffee, I volunteer for breakfast tacos...",
      false,
      {
        questionId: "retreat-attending",
        equalsAny: ["attending", "might-attend"],
      },
    ),
  ],
};

export function createSeededStudio(): RSVPStudio {
  return {
    events: [vegasStudio],
  };
}

// Retained for potential future seeding; not exported from createSeededStudio.
void salonStudio;
void retreatStudio;

function normalizeOption(
  input: Partial<RSVPOption> | undefined,
  index: number,
): RSVPOption {
  const label = input?.label?.trim() || `Option ${index + 1}`;
  const value = input?.value?.trim() || formatSlug(label) || `option-${index + 1}`;

  return {
    id: input?.id?.trim() || createId("option"),
    value,
    label,
    description:
      typeof input?.description === "string" ? input.description : undefined,
  };
}

function normalizeQuestion(
  input: Partial<RSVPQuestion> | undefined,
  index: number,
): RSVPQuestion {
  const type: RSVPQuestionType = questionTypeOptions.some(
    (option) => option.value === input?.type,
  )
    ? (input?.type as RSVPQuestionType)
    : "single_select";

  const normalizedSlug =
    formatSlug(input?.slug || input?.title || `question-${index + 1}`) ||
    `question-${index + 1}`;
  const baseQuestion: RSVPQuestion = {
    id: input?.id?.trim() || createId("question"),
    slug: normalizedSlug,
    eyebrow: input?.eyebrow?.trim() || "Custom question",
    title: input?.title?.trim() || `Question ${index + 1}`,
    description:
      typeof input?.description === "string"
        ? input.description
        : "Write the context for this question.",
    type,
    required: input?.required ?? true,
    placeholder:
      typeof input?.placeholder === "string" ? input.placeholder : undefined,
    min:
      typeof input?.min === "number" && Number.isFinite(input.min)
        ? input.min
        : undefined,
    max:
      typeof input?.max === "number" && Number.isFinite(input.max)
        ? input.max
        : undefined,
    imageUrl:
      typeof input?.imageUrl === "string" && input.imageUrl.trim()
        ? input.imageUrl.trim()
        : undefined,
    imageAlt:
      typeof input?.imageAlt === "string" && input.imageAlt.trim()
        ? input.imageAlt.trim()
        : undefined,
  };

  if (type === "single_select" || type === "multi_select") {
    const rawOptions = Array.isArray(input?.options) ? input?.options : [];
    baseQuestion.options = rawOptions.length
      ? rawOptions.map((option, optionIndex) =>
          normalizeOption(option, optionIndex),
        )
      : [
          normalizeOption(
            {
              label: "Yes",
              value: "yes",
            },
            0,
          ),
          normalizeOption(
            {
              label: "No",
              value: "no",
            },
            1,
          ),
        ];
  }

  if (
    input?.showWhen?.questionId &&
    Array.isArray(input.showWhen.equalsAny) &&
    input.showWhen.equalsAny.length
  ) {
    baseQuestion.showWhen = {
      questionId: input.showWhen.questionId,
      equalsAny: input.showWhen.equalsAny
        .map((value) => value.trim())
        .filter(Boolean),
    };
  }

  return baseQuestion;
}

/**
 * Conservative normalizer for EventContent: returns the stored content if it
 * has the right shape, otherwise falls back to the code-seeded Dallas content.
 * This lets Firestore docs be partial (missing sections fall through to the
 * seed) and the guest routes stay robust against bad admin edits.
 */
function normalizeContent(input: unknown): EventContent | undefined {
  if (!input || typeof input !== "object") {
    return DALLAS_EVENT_CONTENT;
  }
  // Trust stored content structurally; the admin editor below enforces shape
  // at write time. If a required root section is missing, merge with the
  // seed so guest pages never crash.
  const seed = DALLAS_EVENT_CONTENT;
  const stored = input as Partial<EventContent>;
  return {
    ...seed,
    ...stored,
    overview: { ...seed.overview, ...(stored.overview ?? {}) },
    hotel: { ...seed.hotel, ...(stored.hotel ?? {}) },
    travelTips: { ...seed.travelTips, ...(stored.travelTips ?? {}) },
    schedule: {
      days: stored.schedule?.days ?? seed.schedule.days,
    },
    dressBoards: stored.dressBoards ?? seed.dressBoards,
    activities: { ...seed.activities, ...(stored.activities ?? {}) },
    restaurants: { ...seed.restaurants, ...(stored.restaurants ?? {}) },
    deposits: { ...seed.deposits, ...(stored.deposits ?? {}) },
    nextSteps: { ...seed.nextSteps, ...(stored.nextSteps ?? {}) },
  };
}

function normalizeEvent(
  input: Partial<RSVPEvent> | undefined,
  index: number,
): RSVPEvent {
  const questions = Array.isArray(input?.questions)
    ? input.questions.map((question, questionIndex) =>
        normalizeQuestion(question, questionIndex),
      )
    : [createBlankQuestion(1)];

  return {
    id: input?.id?.trim() || createId("event"),
    slug:
      formatSlug(input?.slug || input?.title || `event-${index + 1}`) ||
      `event-${index + 1}`,
    eventLabel: input?.eventLabel?.trim() || "Draft event",
    title: input?.title?.trim() || `Event ${index + 1}`,
    welcomeTitle:
      input?.welcomeTitle?.trim() || "Create a beautiful RSVP experience.",
    timeframe: input?.timeframe?.trim() || "Choose dates",
    location: input?.location?.trim() || "Choose location",
    summary:
      input?.summary?.trim() ||
      "A multi-step RSVP flow built for private events.",
    intro:
      input?.intro?.trim() ||
      "Use the studio to reshape this event and update every question.",
    notes: Array.isArray(input?.notes)
      ? input.notes
          .map((note) => note.trim())
          .filter(Boolean)
      : [],
    questions,
    content: normalizeContent(input?.content),
  };
}

export function normalizeStudio(input: unknown): RSVPStudio {
  if (!input || typeof input !== "object") {
    return createSeededStudio();
  }

  const candidate = input as Partial<RSVPStudio>;

  if (!Array.isArray(candidate.events) || candidate.events.length === 0) {
    return createSeededStudio();
  }

  return {
    events: candidate.events.map((event, index) => normalizeEvent(event, index)),
  };
}
